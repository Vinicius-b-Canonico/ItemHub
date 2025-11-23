import os
from datetime import datetime
from flask import Blueprint, request, jsonify, current_app, send_from_directory
from flask_jwt_extended import jwt_required, get_jwt_identity
from werkzeug.utils import secure_filename
from models import db, Item, User
from utils.image_processing import save_processed_image

item_bp = Blueprint("item", __name__)

# ---------- Helper functions ----------

def allowed_file(filename):
    """Return True if file has an allowed image extension."""
    return "." in filename and filename.rsplit(".", 1)[1].lower() in current_app.config["ALLOWED_EXTENSIONS"]


# ---------- Routes ----------

@item_bp.route("/", methods=["POST"])
@jwt_required()
def create_item():
    """
    POST /api/items/
    ----------------

    Creates a new item listing for the authenticated user.

    **Form-Data fields:**
    - `title` (str, required)
    - `description` (str)
    - `category` (str, required)
    - `offer_type` (str, one of `pay`, `free`, `paid_to_take`)
    - `volume` (float)
    - `location` (str)
    - `duration_days` (int, one of [1, 7, 15, 30])
    - `image` (file, optional)

    **Business rules:**
    - Only authenticated users may create items.
    - Image files are stored under `/uploads`.
    - The `status` defaults to `"ativo"`.
    - Maximum duration is 30 days.

    **Responses:**
    - `201 CREATED` with created item data.
    - `400 BAD REQUEST` if required fields missing or invalid.
    - `415 UNSUPPORTED MEDIA TYPE` if image type invalid.
    """
    user_id = int(get_jwt_identity())
    user:User = User.get_by_id(user_id)
    if not user:
        #has a jwt identity but its not registered on base
        return jsonify({"error": "not propperly logged in"}), 401

    title = request.form.get("title")
    category = request.form.get("category")
    duration_days = request.form.get("duration_days", type=int)
    offer_type = request.form.get("offer_type", "free")

    if not title or not category or not duration_days:
        return jsonify({"error": "Missing required fields"}), 400
    if duration_days not in [1, 7, 15, 30]:
        return jsonify({"error": "Invalid duration"}), 400

    image_url = None
    if "image" in request.files:
        file = request.files["image"]

        if file and allowed_file(file.filename):
            filename = save_processed_image(
                file_storage=file,
                upload_folder=current_app.config["UPLOAD_FOLDER"]
            )
            image_url = f"/items/image/{filename}"
        else:
            return jsonify({"error": "Invalid file type"}), 415


    item:Item = Item(
        owner=user,
        owner_username=user.username,
        title=title,
        description=request.form.get("description"),
        category=category,
        offer_type=offer_type,
        volume=request.form.get("volume", type=float),
        location=request.form.get("location"),
        duration_days=duration_days,
        image_url=image_url,
        created_at=datetime.utcnow(),
    )
    db.session.add(item)
    db.session.commit()

    return jsonify({"message": "Item created successfully", "item_id": item.id}), 201


@item_bp.route("/", methods=["GET"])
def list_items():
    """
    GET /api/items/
    ----------------
    Returns paginated list of active items.

    Query params:
    - category          (optional)
    - owner_id          (optional)
    - status            (default = "ativo")
    - page              (default = 1)
    - page_size         (default = 20)

    Response:
    {
        "items": [...],
        "page": 1,
        "page_size": 20,
        "total_items": 233,
        "total_pages": 12
    }
    """

    # ------------------------------
    # Read query params
    # ------------------------------
    category = request.args.get("category")
    owner_id = request.args.get("owner_id", type=int)
    status = request.args.get("status", "ativo")
    page = request.args.get("page", default=1, type=int)
    page_size = request.args.get("page_size", default=20, type=int)

    # Safety: enforce bounds
    if page < 1:
        page = 1
    if page_size < 1 or page_size > 100:
        page_size = 20

    # ------------------------------
    # Base query with filters
    # ------------------------------
    query = Item.query.filter_by(status=status)

    if category:
        query = query.filter_by(category=category)

    if owner_id:
        query = query.filter_by(owner_id=owner_id)

    # ------------------------------
    # Pagination count (efficient)
    # ------------------------------
    total_items = query.count()

    # Sorting + pagination
    items = (
        query
        .order_by(Item.created_at.desc())
        .offset((page - 1) * page_size)
        .limit(page_size)
        .all()
    )

    # ------------------------------
    # Build response
    # ------------------------------
    results = [i.to_dict() for i in items]

    total_pages = (total_items + page_size - 1) // page_size  # ceiling division

    return jsonify({
        "items": results,
        "page": page,
        "page_size": page_size,
        "total_items": total_items,
        "total_pages": total_pages
    }), 200




@item_bp.route("/<int:item_id>", methods=["GET"])
def get_item(item_id):
    """
    GET /api/items/<id>
    -------------------
    Returns a single item by ID.
    """
    item:Item = Item.get_by_id(item_id)
    if not item: 
        return jsonify({"error": "item not found"}), 404

    return jsonify(item.to_dict()), 200

@item_bp.route("/<int:item_id>", methods=["PUT"])
@jwt_required()
def update_item(item_id):
    """
    PUT /api/items/<id>
    -------------------
    Updates an existing item.  
    Only the owner may update it.  
    Accepts JSON body or multipart/form-data (for image replacement).
    """
    user_id = int(get_jwt_identity())
    user:User = User.get_by_id(user_id)
    if not user:
        #has a jwt identity but its not registered on base
        return jsonify({"error": "not propperly logged in"}), 401
    
    item:Item = Item.get_by_id(item_id)
    if not item: 
        return jsonify({"error": "item not found"}), 404
    
    if item.owner_id != user_id:
        return jsonify({"error": "Not authorized"}), 403

    data = request.form or request.get_json() or {}
    for field in ["title", "description", "category", "offer_type", "volume", "location", "duration_days"]:
        if field in data:
            setattr(item, field, data[field])

     # Optional new image upload
    if "image" in request.files:
        file = request.files["image"]

        if file and allowed_file(file.filename):
            # Use new centralized processing
            filename = save_processed_image(
                file_storage=file,
                upload_folder=current_app.config["UPLOAD_FOLDER"]
            )
            item.image_url = f"/items/image/{filename}"
        else:
            return jsonify({"error": "Invalid file type"}), 415

    db.session.commit()
    return jsonify({"message": "Item updated"}), 200


@item_bp.route("/<int:item_id>", methods=["DELETE"])
@jwt_required()
def delete_item(item_id):
    """
    DELETE /api/items/<id>
    ----------------------
    Cancels (soft-deletes) an item listing.  
    Only the owner may cancel.  
    The item’s status is set to `"cancelado"`.
    """
    user_id = int(get_jwt_identity())
    user:User = User.get_by_id(user_id)
    if not user:
        #has a jwt identity but its not registered on base
        return jsonify({"error": "not propperly logged in"}), 401
    item:Item = Item.get_by_id(item_id)
    if not item: 
        return jsonify({"error": "item not found"}), 404
    if item.owner_id != user_id:
        return jsonify({"error": "Not authorized"}), 403

    item.status = "cancelado"
    db.session.commit()
    return jsonify({"message": "Item canceled"}), 200


@item_bp.route("/image/<filename>")
def serve_image(filename):
    """
    GET /api/items/image/<filename>
    -------------------------------
    Serves an uploaded image file from disk.
    """
    return send_from_directory(current_app.config["UPLOAD_FOLDER"], filename)


# ============================================================
# 📘 Get available item categories
# ============================================================
@item_bp.route("/categories", methods=["GET"])
def get_item_categories():
    """
    GET /api/items/categories
    -------------------------
    Returns a list of valid categories for item creation and searching.

    Currently hardcoded, but in the future could be dynamic from db/redis.

    **Response:**
    - 200 OK with {"categories": [...]}
    """
    categories = [
        "Electronics",
        "Furniture",
        "Clothing",
        "Books",
        "Tools",
        "Toys",
        "Food",
        "Appliances",
        "Sports",
        "Miscellaneous"
    ]
    return jsonify({"categories": categories}), 200
