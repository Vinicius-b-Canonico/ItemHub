import os
from datetime import datetime
from flask import Blueprint, request, jsonify, current_app, send_from_directory
from flask_jwt_extended import jwt_required, get_jwt_identity
from werkzeug.utils import secure_filename
from models import db, Item, User, ItemImage
from utils.image_processing import save_processed_image
import json

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
    CREATE ITEM — now supports MULTIPLE IMAGES.
    Use form-data with `images` as a multi-file field.
    """
    user_id = int(get_jwt_identity())
    user: User = User.get_by_id(user_id)
    if not user:
        return jsonify({"error": "not properly logged in"}), 401

    title = request.form.get("title")
    category = request.form.get("category")
    duration_days = request.form.get("duration_days", type=int)
    offer_type = request.form.get("offer_type", "free")

    if not title or not category or not duration_days:
        return jsonify({"error": "Missing required fields"}), 400
    if duration_days not in [1, 7, 15, 30]:
        return jsonify({"error": "Invalid duration"}), 400

    # ------------------------------------------------------------------
    # Handle MULTIPLE image uploads
    # ------------------------------------------------------------------
    uploaded_files = request.files.getlist("images")
    saved_images = []

    # Backwards compatibility: support legacy "image" field
    legacy_single = request.files.get("image")
    if legacy_single:
        uploaded_files.append(legacy_single)

    for f in uploaded_files:
        if not f or not allowed_file(f.filename):
            return jsonify({"error": "Invalid file type"}), 415

        filename = save_processed_image(
            file_storage=f,
            upload_folder=current_app.config["UPLOAD_FOLDER"]
        )
        saved_images.append(filename)

    # Choose the FIRST image as the "main" compatibility field
    main_image_url = None
    if saved_images:
        main_image_url = f"/items/image/{saved_images[0]}"

    # ------------------------------------------------------------------
    # Create Item
    # ------------------------------------------------------------------
    item = Item(
        owner=user,
        owner_username=user.username,
        title=title,
        description=request.form.get("description"),
        category=category,
        offer_type=offer_type,
        volume=request.form.get("volume", type=float),
        location=request.form.get("location"),
        duration_days=duration_days,
        image_url=main_image_url,     # still exists for main display
        created_at=datetime.utcnow(),
    )
    db.session.add(item)
    db.session.commit()

    # ------------------------------------------------------------------
    # Create ItemImage rows
    # ------------------------------------------------------------------
    for idx, filename in enumerate(saved_images):
        img = ItemImage(
            item_id=item.id,
            image_url=f"/items/image/{filename}",
            position=idx,
            enabled=True
        )
        db.session.add(img)

    db.session.commit()

    return jsonify({"message": "Item created successfully", "item_id": item.id}), 201

@item_bp.route("/<int:item_id>", methods=["PUT"])
@jwt_required()
def update_item(item_id):
    """
    UPDATE ITEM — supports:
    - Updating item fields
    - Deleting specific images
    - Reordering images
    - Appending new images
    - Clearing all images
    """
    user_id = int(get_jwt_identity())
    user: User = User.get_by_id(user_id)
    if not user:
        return jsonify({"error": "not properly logged in"}), 401

    item: Item = Item.get_by_id(item_id)
    if not item:
        return jsonify({"error": "item not found"}), 404
    if item.owner_id != user_id:
        return jsonify({"error": "Not authorized"}), 403

    data = request.form or request.get_json() or {}

    # -------------------------------------------------------
    # Update standard item fields
    # -------------------------------------------------------
    editable_fields = [
        "title", "description", "category", "offer_type",
        "volume", "location", "duration_days"
    ]
    for field in editable_fields:
        if field in data:
            setattr(item, field, data[field])

    # -------------------------------------------------------
    # IMAGE HANDLING PIPELINE
    # -------------------------------------------------------

    # 1. CLEAR ALL IMAGES (if requested)
    clear_images = data.get("clear_images") in ["1", "true", True]

    if clear_images:
        ItemImage.query.filter_by(item_id=item.id).delete()
        item.image_url = None
        db.session.commit()
        return jsonify({"message": "Item updated"}), 200

    # 2. DELETE SPECIFIC IMAGES
    delete_ids = request.form.getlist("delete_image_ids")
    delete_ids = [int(x) for x in delete_ids if x.isdigit()]

    if delete_ids:
        ItemImage.query.filter(
            ItemImage.item_id == item.id,
            ItemImage.id.in_(delete_ids)
        ).delete(synchronize_session=False)

    # 3. REORDER IMAGES (optional)
    new_order_raw = data.get("new_image_order")

    if new_order_raw:
        try:
            order_list = json.loads(new_order_raw)  # e.g. [4, 12, 7, 9]
            order_list = [int(x) for x in order_list]

            # Fetch all remaining item images
            existing_images = ItemImage.query.filter_by(item_id=item.id).all()
            img_map = {img.id: img for img in existing_images}

            # Apply new positions based on provided order
            for pos, img_id in enumerate(order_list):
                if img_id in img_map:
                    img_map[img_id].position = pos
                    img_map[img_id].enabled = True

            # Any images NOT included get placed after the ordered list
            tail_position = len(order_list)
            for img in existing_images:
                if img.id not in order_list:
                    img.position = tail_position
                    tail_position += 1

        except Exception:
            return jsonify({"error": "Invalid new_image_order JSON"}), 400

    # 4. NORMALIZE POSITIONS (ensure 0..N-1)
    remaining = ItemImage.query.filter_by(item_id=item.id).order_by(ItemImage.position).all()
    for i, img in enumerate(remaining):
        img.position = i

    # 5. APPEND NEW IMAGES
    new_files = request.files.getlist("images")

    # Legacy compatibility: "image" field
    legacy_single = request.files.get("image")
    if legacy_single:
        new_files.append(legacy_single)

    saved_images = []
    for f in new_files:
        if not f or not allowed_file(f.filename):
            return jsonify({"error": "Invalid file type"}), 415

        filename = save_processed_image(
            file_storage=f,
            upload_folder=current_app.config["UPLOAD_FOLDER"]
        )
        saved_images.append(filename)

    # Append them after normalization
    if saved_images:
        start_pos = len(remaining)

        for i, filename in enumerate(saved_images):
            db.session.add(
                ItemImage(
                    item_id=item.id,
                    image_url=f"/items/image/{filename}",
                    position=start_pos + i,
                    enabled=True
                )
            )

        # Refetch for new main image selection
        remaining = ItemImage.query.filter_by(item_id=item.id).order_by(ItemImage.position).all()

    # 6. Update MAIN IMAGE URL
    first = ItemImage.query.filter_by(item_id=item.id).order_by(ItemImage.position).first()
    item.image_url = first.image_url if first else None

    db.session.commit()
    return jsonify({"message": "Item updated"}), 200


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

    teh send_from_directory has inner basic security checks 
    against path traversal and similar potential attacks, 
    so we can use it directly in this portfolio project.
    """
    return send_from_directory(current_app.config["UPLOAD_FOLDER"], filename)



@item_bp.route("/<int:item_id>/images", methods=["POST"])
@jwt_required()
def upload_item_image(item_id):
    """
    Upload a single image for an existing item.
    Does NOT finalize it — 'enabled' remains False until the user saves the item.
    """

    user_id = int(get_jwt_identity())
    user = User.get_by_id(user_id)
    if not user:
        return jsonify({"error": "not properly logged in"}), 401

    item = Item.get_by_id(item_id)
    if not item:
        return jsonify({"error": "item not found"}), 404
    if item.owner_id != user_id:
        return jsonify({"error": "Not authorized"}), 403

    # Validate file
    file = request.files.get("file")
    if not file:
        return jsonify({"error": "No file uploaded"}), 400
    if not allowed_file(file.filename):
        return jsonify({"error": "Invalid file type"}), 415

    # Save file to disk using your existing helper
    filename = save_processed_image(
        file_storage=file,
        upload_folder=current_app.config["UPLOAD_FOLDER"]
    )

    # Insert disabled image into DB
    new_img = ItemImage(
        item_id=item.id,
        image_url=f"/api/items/image/{filename}",
        position=99999,      # appended to end, normalized later
        enabled=False,       # NOT finalized yet
    )

    db.session.add(new_img)
    db.session.commit()

    return jsonify(new_img.to_dict()), 201



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
