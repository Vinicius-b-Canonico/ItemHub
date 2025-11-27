import os
from datetime import datetime
from flask import Blueprint, request, jsonify, current_app, send_from_directory
from flask_jwt_extended import jwt_required, get_jwt_identity
from werkzeug.utils import secure_filename
from models import db, Item, User, ItemImage
from utils.image_processing import save_uploaded_image
import json
import requests
from utils.location import is_valid_state, is_valid_city
from config import Config

item_bp = Blueprint("item", __name__)

# ---------- Helper functions ----------

def allowed_file(filename):
    """Return True if file has an allowed image extension."""
    return "." in filename and filename.rsplit(".", 1)[1].lower() in Config.ALLOWED_EXTENSIONS


# ---------- Routes ----------
@item_bp.route("/", methods=["POST"])
@jwt_required()
def create_item():
    user_id = int(get_jwt_identity())
    user: User = User.get_by_id(user_id)
    if not user:
        return jsonify({"error": "not properly logged in"}), 401

    title = request.form.get("title")
    category = request.form.get("category")
    duration_days = request.form.get("duration_days", type=int)
    offer_type = request.form.get("offer_type", "free")

    # NEW location fields
    state = request.form.get("state")
    city = request.form.get("city")
    address = request.form.get("address")

    if not title or not category or not duration_days:
        return jsonify({"error": "Missing required fields"}), 400
    if duration_days not in [1, 7, 15, 30]:
        return jsonify({"error": "Invalid duration"}), 400

    # ----------------------------------------------------------
    # LOCATION VALIDATION USING THE NEW CORE HELPERS
    # ----------------------------------------------------------
    if not state or not city:
        return jsonify({"error": "State and city are required"}), 400

    if not is_valid_state(state):
        return jsonify({"error": f"Invalid state: {state}"}), 400

    if not is_valid_city(state, city):
        return jsonify({"error": f"Invalid city '{city}' for state '{state}'"}), 400

    # ----------------------------------------------------------
    # MULTIPLE IMAGE HANDLING (unchanged)
    # ----------------------------------------------------------
    uploaded_files = request.files.getlist("images")
    saved_images = []

    legacy_single = request.files.get("image")
    if legacy_single:
        uploaded_files.append(legacy_single)

    for f in uploaded_files:
        if not f or not allowed_file(f.filename):
            return jsonify({"error": "Invalid file type"}), 415

        filename = save_uploaded_image(
            file_storage=f,
            upload_folder=current_app.config["UPLOAD_FOLDER"]
        )
        saved_images.append(filename)

    main_image_url = None
    if saved_images:
        main_image_url = f"/items/image/{saved_images[0]}"

    # ----------------------------------------------------------
    # CREATE ITEM
    # ----------------------------------------------------------
    item = Item(
        owner=user,
        owner_username=user.username,
        title=title,
        description=request.form.get("description"),
        category=category,
        offer_type=offer_type,
        volume=request.form.get("volume", type=float),
        state=state,
        city=city,
        address=address,
        duration_days=duration_days,
        image_url=main_image_url,
        created_at=datetime.utcnow(),
    )

    db.session.add(item)
    db.session.commit()

    # Save item images
    for idx, filename in enumerate(saved_images):
        db.session.add(ItemImage(
            item_id=item.id,
            image_url=f"/items/image/{filename}",
            position=idx,
            enabled=True
        ))

    db.session.commit()

    return jsonify({"message": "Item created successfully", "item_id": item.id}), 201


@item_bp.route("/<int:item_id>", methods=["PUT"])
@jwt_required()
def update_item(item_id):
    user_id = int(get_jwt_identity())
    user: User = User.get_by_id(user_id)
    if not user:
        return jsonify({"error": "not properly logged in"}), 401

    item:Item = Item.get_by_id(item_id)
    if not item:
        return jsonify({"error": "item not found"}), 404
    if item.owner_id != user_id:
        return jsonify({"error": "Not authorized"}), 403
    if not item.is_valid:
        if item.status in ["cancelado","espirado"]:
            return jsonify({"error": "este item foi permanentemente cancelado."}), 410
        return jsonify({"error": "o status deste item não permite mudanças"}), 404

    data = request.form or request.get_json() or {}

    # -------------------------------------------------------
    # Update STANDARD fields
    # -------------------------------------------------------
    editable_fields = [
        "title", "description", "category", "offer_type",
        "volume", "duration_days",
        "state", "city", "address"
    ]

    for field in editable_fields:
        if field in data:
            setattr(item, field, data[field])

    # -------------------------------------------------------
    # LOCATION VALIDATION (only if user changed the fields)
    # -------------------------------------------------------
    if "state" in data or "city" in data:
        state = item.state
        city = item.city

        if not state or not city:
            return jsonify({"error": "State and city are required"}), 400

        if not is_valid_state(state):
            return jsonify({"error": f"Invalid state: {state}"}), 400

        if not is_valid_city(state, city):
            return jsonify({"error": f"Invalid city '{city}' for state '{state}'"}), 400

    # -------------------------------------------------------
    # IMAGE HANDLING (unchanged)
    # -------------------------------------------------------

    clear_images = data.get("clear_images") in ["1", "true", True]
    if clear_images:
        ItemImage.query.filter_by(item_id=item.id).delete()
        item.image_url = None
        db.session.commit()
        return jsonify({"message": "Item updated"}), 200

    delete_ids = request.form.getlist("delete_image_ids")
    delete_ids = [int(x) for x in delete_ids if x.isdigit()]

    if delete_ids:
        ItemImage.query.filter(
            ItemImage.item_id == item.id,
            ItemImage.id.in_(delete_ids)
        ).delete(synchronize_session=False)

    new_order_raw = data.get("new_image_order")
    if new_order_raw:
        try:
            order_list = json.loads(new_order_raw)
            order_list = [int(x) for x in order_list]

            existing_images = ItemImage.query.filter_by(item_id=item.id).all()
            img_map = {img.id: img for img in existing_images}

            for pos, img_id in enumerate(order_list):
                if img_id in img_map:
                    img_map[img_id].position = pos
                    img_map[img_id].enabled = True

            tail = len(order_list)
            for img in existing_images:
                if img.id not in order_list:
                    img.position = tail
                    tail += 1
        except Exception:
            return jsonify({"error": "Invalid new_image_order JSON"}), 400

    remaining = ItemImage.query.filter_by(item_id=item.id).order_by(ItemImage.position).all()
    for i, img in enumerate(remaining):
        img.position = i

    new_files = request.files.getlist("images")
    legacy_single = request.files.get("image")
    if legacy_single:
        new_files.append(legacy_single)

    saved_images = []
    for f in new_files:
        if not f or not allowed_file(f.filename):
            return jsonify({"error": "Invalid file type"}), 415

        filename = save_uploaded_image(
            file_storage=f,
            upload_folder=current_app.config["UPLOAD_FOLDER"]
        )
        saved_images.append(filename)

    if saved_images:
        start_pos = len(remaining)
        for i, filename in enumerate(saved_images):
            db.session.add(ItemImage(
                item_id=item.id,
                image_url=f"/items/image/{filename}",
                position=start_pos + i,
                enabled=True
            ))

        remaining = ItemImage.query.filter_by(item_id=item.id).order_by(ItemImage.position).all()

    first = ItemImage.query.filter_by(item_id=item.id).order_by(ItemImage.position).first()
    item.image_url = first.image_url if first else None

    db.session.commit()
    return jsonify({"message": "Item updated"}), 200

@item_bp.route("/", methods=["GET"])
def list_items():
    """
    GET /api/items/
    Fully supports:
      - Multi-category (comma-separated)
      - Multi-state & multi-city
      - Full-text search in title + description
      - Proper pagination response
    """
    # ------------------------------
    # Query parameters
    # ------------------------------
    categories = request.args.get("categories", "")
    owner_id = request.args.get("owner_id", type=int)
    offer_types = request.args.get("offer_type", "")
    
    raw_states = request.args.get("states", "")
    raw_cities = request.args.get("cities", "")
    
    search = request.args.get("search", "").strip()
    status = request.args.get("status", "ativo")
    
    page = max(1, request.args.get("page", default=1, type=int))
    page_size = min(100, max(1, request.args.get("page_size", default=20, type=int)))

    # Normalize lists
    categories = [c.strip() for c in categories.split(",") if c.strip()]
    states = [s.strip() for s in raw_states.split(",") if s.strip()]
    cities = [c.strip() for c in raw_cities.split(",") if c.strip()]
    offer_types = [c.strip() for c in offer_types.split(",") if c.strip()] 
    # ------------------------------
    # Base query
    # ------------------------------
    query = Item.query.filter_by(status=status)

    if status == "ativo":
        query = query.filter(Item.is_valid)

    if owner_id is not None:
        query = query.filter_by(owner_id=owner_id)

    if offer_types:
        query = query.filter(Item.offer_type.in_(offer_types))

    # Multi-category: item must have ANY of the selected categories
    if categories:
        query = query.filter(Item.category.in_(categories))

    # Multi-state / multi-city
    if states:
        query = query.filter(Item.state.in_(states))
    if cities:
        query = query.filter(Item.city.in_(cities))

    # Full-text search in title OR description
    if search:
        search_pattern = f"%{search}%"
        query = query.filter(
            db.or_(
                Item.title.ilike(search_pattern),
                Item.description.ilike(search_pattern)
            )
        )

    # ------------------------------
    # Execute with pagination
    # ------------------------------
    total_items = query.count()

    items = (
        query
        .order_by(Item.created_at.desc())
        .offset((page - 1) * page_size)
        .limit(page_size)
        .all()
    )

    total_pages = (total_items + page_size - 1) // page_size

    return jsonify({
        "items": [item.to_dict() for item in items],
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
    filename = save_uploaded_image(
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
        "Eletrônicos",
        "Informática",
        "Celulares e Acessórios",
        "Games",
        "Eletrodomésticos",
        "Móveis",
        "Decoração",
        "Roupas",
        "Calçados",
        "Acessórios de Moda",
        "Esporte e Lazer",
        "Livros",
        "Papelaria",
        "Ferramentas",
        "Construção",
        "Automotivo",
        "Bebês e Infantil",
        "Brinquedos",
        "Pet Shop",
        "Saúde e Beleza",
        "Perfumaria",
        "Cozinha",
        "Alimentos e Bebidas",
        "Jardinagem",
        "Colecionáveis",
        "Instrumentos Musicais",
        "Arte e Artesanato",
        "Fotografia",
        "Som e Áudio",
        "Filmes e Séries",
        "Casa Inteligente",
        "Camping e Aventura",
        "Relógios",
        "Joias",
        "Puzzles e Board Games",
        "Papelaria e Escritório",
        "Outros"
    ]


    return jsonify({"categories": categories}), 200



