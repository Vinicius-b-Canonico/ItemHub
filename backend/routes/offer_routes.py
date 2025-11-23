from flask import Blueprint, request, jsonify
from flask_jwt_extended import jwt_required, get_jwt_identity
from models import db, Offer, Item, User
from datetime import datetime

offer_bp = Blueprint("offers", __name__)

# ============================================================
# 📌 Create a new offer
# ============================================================
@offer_bp.route("/", methods=["POST"])
@jwt_required()
def create_offer():
    """
    Create a new offer (bid) on an existing item.
    """
    user_id = int(get_jwt_identity())
    # Fetch user AND ensure it exists
    user = User.get_by_id(user_id)
    if not user:
        return jsonify({"error": "User not found"}), 401
    data = request.get_json()

    item_id = data.get("item_id")
    price = data.get("price")
    message = data.get("message", "")

    if item_id is None or price is None:
        return jsonify({"error": "Missing required fields"}), 400



    # Fetch item
    item:Item = Item.get_by_id(item_id)
    if not item:
        return jsonify({"error": "Item not found"}), 404

    # Prevent users from offering on their own items
    if item.owner_id == user_id:
        return jsonify({"error": "You cannot make offers on your own item"}), 403

    # Block offers on unavailable items
    if item.status in ["cancelado", "negociado", "expired"]:
        return jsonify({"error": f"Item is not available for offers ({item.status})"}), 400

    # 🆕 Prevent duplicate offers from the same user for the same item
    existing_offer = Offer.find_valid_user_offer_for_item(user_id, item.id)
    if existing_offer:
        return jsonify({"error": "You have already made an offer on this item"}), 400

    # Create offer
    offer = Offer(
        user_id=user_id,
        user_name=user.username,   # ← NEW
        item_id=item_id,
        price=float(price),
        message=message,
        status="ativo",
        created_at=datetime.utcnow(),
    )

    db.session.add(offer)
    db.session.commit()

    return jsonify(offer.to_dict()), 201


# ============================================================
# 📋 Get a specific offer by ID
# includes soft deleted entries.
# ============================================================
@offer_bp.route("/<int:offer_id>", methods=["GET"])
def get_offer_by_id(offer_id):
    """
    Retrieve a single offer by its ID.

    Business Rules:
    - Public endpoint (does not require authentication).
    - Returns full offer details for display or inspection.
    - Can be used by buyers, sellers, or moderators.

    Path Parameter:
        offer_id (int): ID of the offer to fetch.

    Returns:
        200 OK: Offer details.
        404 Not Found: If the offer does not exist.
    """
    offer:Offer = Offer.query.get(offer_id)
    if not offer:
        return jsonify({"error": "Offer not found"}), 404

    return jsonify(offer.to_dict()), 200


# ============================================================
# 📋 Get all offers for an item (with status filtering)
# ============================================================
@offer_bp.route("/item/<int:item_id>", methods=["GET"])
def get_offers_for_item(item_id):
    """
    Retrieve all offers for a given item, but only if their status
    is in a predefined allowed list.
    """

    item = Item.query.get(item_id)
    if not item:
        return jsonify({"error": "Item not found"}), 404


    offers = (
        Offer.query
             .filter(
                 Offer.item_id == item_id,
                 Offer.status.in_(Offer.allowed_statuses())
             )
             .order_by(Offer.created_at.desc())
             .all()
    )

    return jsonify([o.to_dict() for o in offers]), 200


# ============================================================
# 📌 Get all offers made by the logged-in user
# ============================================================
@offer_bp.route("/my", methods=["GET"])
@jwt_required()
def get_my_offers():
    """
    Returns all valid (active) offers made by the logged-in user.
    Includes item data for each offer to support dashboard rendering.
    """

    user_id = int(get_jwt_identity())

    # Fetch offers
    offers: list[Offer] = (
        Offer.query
            .filter(
                Offer.user_id == user_id,
                Offer.status.in_(Offer.allowed_statuses())
            )
            .order_by(Offer.created_at.desc())
            .all()
    )

    # Build response combining offer + item
    result = []
    for offer in offers:
        item:Item = offer.item
        result.append({
            "offer": offer.to_dict(),
            "item": item.to_dict() if item else None
        })

    return jsonify(result), 200


# ============================================================
# ❌ Cancel own offer
# ============================================================
@offer_bp.route("/<int:offer_id>/cancel", methods=["PATCH"])
@jwt_required()
def cancel_offer(offer_id):
    """
    Cancel an active offer made by the logged-in user.

    Business Rules:
    - Only the user who created the offer can cancel it.
    - Once cancelled, the offer cannot be reactivated.
    - Cancelled offers remain in the database for history.

    Path Parameter:
        offer_id (int): ID of the offer to cancel.

    Returns:
        200 OK on success, 403 if unauthorized, 404 if not found.
    """
    user_id = int(get_jwt_identity())
    user:User = User.get_by_id(user_id)
    if not user:
        #has a jwt identity but its not registered on base
        return jsonify({"error": "not propperly logged in"}), 401 
    offer:Offer = Offer.query.get(offer_id)

    if not offer:
        return jsonify({"error": "Offer not found"}), 404

    if offer.user_id != user_id:
        return jsonify({"error": "You can only cancel your own offers"}), 403

    if offer.status != "ativo":
        return jsonify({"error": "Offer is not active and thus cant be cancelled"}), 400

    offer.status = "cancelado"
    db.session.commit()

    return jsonify({"message": "Offer cancelled successfully", "offer_id": offer_id}), 200


# ============================================================
# ✅ Confirm negotiation (both users must confirm)
# ============================================================
@offer_bp.route("/<int:offer_id>/confirm", methods=["PATCH"])
@jwt_required()
def confirm_offer(offer_id):
    """
    Confirm participation in a pending negotiation.

    Business Rules:
    - This endpoint is used by both the item owner and the winning offer's user.
    - Only valid if the offer is in 'pendendo_confirmacao' status.
    - Each of the two involved users (owner and bidder) must confirm once.
    - When both users have confirmed, the item and offer become 'negociado'.
    - If either user later declines, it becomes 'cancelado' (see decline_offer()).

    Path Parameter:
        offer_id (int): ID of the offer being confirmed.

    Request JSON:
    {
        "action": "confirm"  # future-proof for consistency
    }

    Returns:
        200 OK on successful confirmation.
        403 if unauthorized or offer not related to user.
        400 if offer not in the correct status.
    """
    user_id = int(get_jwt_identity())
    user:User = User.get_by_id(user_id)
    if not user:
        #has a jwt identity but its not registered on base
        return jsonify({"error": "not propperly logged in"}), 401
    offer:Offer = Offer.query.get(offer_id)

    if not offer:
        return jsonify({"error": "Offer not found"}), 404

    if offer.status != "pendendo_confirmacao":
        return jsonify({"error": "Offer is not pending confirmation"}), 400

    item = Item.query.get(offer.item_id)
    if not item:
        return jsonify({"error": "Item not found"}), 404

    # Track confirmations using temporary flags
    if not hasattr(offer, "owner_confirmed"):
        offer.owner_confirmed = False
    if not hasattr(offer, "bidder_confirmed"):
        offer.bidder_confirmed = False

    # Identify who is confirming
    if user_id == item.user_id:
        offer.owner_confirmed = True
    elif user_id == offer.user_id:
        offer.bidder_confirmed = True
    else:
        return jsonify({"error": "You are not part of this negotiation"}), 403

    # Check if both confirmed
    if offer.owner_confirmed and offer.bidder_confirmed:
        offer.status = "negociado"
        item.status = "negociado"
        db.session.commit()
        print(f"[NEGOTIATION] Offer {offer.id} and item {item.id} finalized successfully.")
        return jsonify({"message": "Negotiation finalized successfully."}), 200

    db.session.commit()
    return jsonify({"message": "Your confirmation was recorded. Waiting for the other party."}), 200


# ============================================================
# ❌ Decline negotiation (either side)
# ============================================================
@offer_bp.route("/<int:offer_id>/decline", methods=["PATCH"])
@jwt_required()
def decline_offer(offer_id):
    """
    Decline a pending negotiation offer.

    Business Rules:
    - Either the item owner or the bidder can decline.
    - Once declined, both the item and offer statuses change to 'cancelado'.
    - This action is final; cannot be reverted.

    Path Parameter:
        offer_id (int): ID of the offer being declined.

    Returns:
        200 OK on success.
        403 if unauthorized.
        400 if offer not in pending state.
    """
    user_id = int(get_jwt_identity())
    user:User = User.get_by_id(user_id)
    if not user:
        #has a jwt identity but its not registered on base
        return jsonify({"error": "not propperly logged in"}), 401
    offer:Offer = Offer.query.get(offer_id)

    if not offer:
        return jsonify({"error": "Offer not found"}), 404

    if offer.status != "pendendo_confirmacao":
        return jsonify({"error": "Offer is not pending confirmation"}), 400

    item = Item.query.get(offer.item_id)
    if not item:
        return jsonify({"error": "Item not found"}), 404

    # Only parties involved can decline
    if user_id not in [item.user_id, offer.user_id]:
        return jsonify({"error": "You are not part of this negotiation"}), 403

    offer.status = "cancelado"
    item.status = "cancelado"
    db.session.commit()

    print(f"[NEGOTIATION] Offer {offer.id} declined. Item {item.id} cancelled.")
    return jsonify({"message": "Negotiation cancelled successfully."}), 200


# ============================================================
# ✏️ Edit an existing offer
# ============================================================
@offer_bp.route("/<int:offer_id>", methods=["PUT"])
@jwt_required()
def edit_offer(offer_id):
    """
    Edit an existing offer.

    Business Rules:
    - Only logged-in users may edit offers.
    - Users can ONLY edit their own offers.
    - Offer must be in status "ativo".
    - The associated item must still allow negotiation
      (cannot be cancelado, negociado, expired).
    - Editable fields: price, message.

    Request JSON (all optional):
    {
        "price": 75.0,
        "message": "Updated text"
    }

    Returns:
        200 OK with updated offer
        403 Forbidden (not owner)
        404 Not Found (offer doesn't exist)
        409 Conflict (cannot edit due to state/rules)
    """
    user_id = int(get_jwt_identity())
    user:User = User.get_by_id(user_id)
    if not user:
        #has a jwt identity but its not registered on base
        return jsonify({"error": "not propperly logged in"}), 401
    data = request.get_json() or {}

    offer:Offer = Offer.query.get(offer_id)
    if not offer:
        return jsonify({"error": "Offer not found"}), 404

    # Check ownership
    if offer.user_id != user_id:
        return jsonify({"error": "You are not allowed to edit this offer"}), 403

    # Offer must be active
    if offer.status != "ativo":
        return jsonify({"error": f"Offer cannot be edited (status: {offer.status})"}), 409

    # Associated item must be valid for negotiation
    item = Item.query.get(offer.item_id)
    if not item:
        return jsonify({"error": "Item linked to this offer no longer exists"}), 404

    if item.status in ["cancelado", "negociado", "expired"]:
        return jsonify({"error": f"Item no longer accepts negotiation ({item.status})"}), 409

    # Apply allowed updates
    updated = False

    if "price" in data:
        try:
            offer.price = float(data["price"])
            updated = True
        except (TypeError, ValueError):
            return jsonify({"error": "Invalid price value"}), 400

    if "message" in data:
        offer.message = data["message"]
        updated = True

    if not updated:
        return jsonify({"error": "No valid fields to update"}), 400

    db.session.commit()

    return jsonify(offer.to_dict()), 200
