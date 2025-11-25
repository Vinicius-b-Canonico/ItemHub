from datetime import datetime, timedelta
from flask_sqlalchemy import SQLAlchemy

db = SQLAlchemy()

class User(db.Model):
    __tablename__ = "users"

    id = db.Column(db.Integer, primary_key=True)
    username = db.Column(db.String(80), unique=True, nullable=False)
    email = db.Column(db.String(120), unique=True, nullable=False)
    password_hash = db.Column(db.String(512), nullable=False)
    full_name = db.Column(db.String(120))
    created_at = db.Column(db.DateTime, default=datetime.utcnow)

    items = db.relationship("Item", back_populates="owner", cascade="all, delete-orphan")
    offers = db.relationship("Offer", back_populates="user", cascade="all, delete-orphan")

    def __repr__(self):
        return f"<User {self.username}>"
    
    def to_dict(self):
        return {
            "id": self.id,
            "username": self.username,
            "email": self.email,
            "full_name": self.full_name,
            "created_at": self.created_at.isoformat()
        }

    @staticmethod
    def get_by_id(user_id: int):
        if user_id is None:
            return None
        return User.query.get(user_id)

class ItemImage(db.Model):
    __tablename__ = "item_images"

    id = db.Column(db.Integer, primary_key=True)
    item_id = db.Column(db.Integer, db.ForeignKey("items.id"), nullable=False)
    image_url = db.Column(db.String(200), nullable=False)
    position = db.Column(db.Integer, default=0)
    enabled = db.Column(db.Boolean, default=True, nullable=False)

    def __repr__(self):
        return f"<ItemImage {self.id} for Item {self.item_id}>"

    def to_dict(self):
        return {
            "id": self.id,
            "item_id": self.item_id,
            "image_url": self.image_url,
            "position": self.position,
            "enabled": self.enabled,
        }


class Item(db.Model):
    __tablename__ = "items"

    id = db.Column(db.Integer, primary_key=True)
    owner_id = db.Column(db.Integer, db.ForeignKey("users.id"), nullable=False)
    owner_username = db.Column(db.String(80), nullable=False)

    title = db.Column(db.String(100), nullable=False)
    description = db.Column(db.Text)
    category = db.Column(db.String(50), nullable=False)
    image_url = db.Column(db.String(200))  # legacy single image

    offer_type = db.Column(db.String(20))
    volume = db.Column(db.Float)

    # -------------------------------
    # NEW LOCATION FIELDS
    # -------------------------------
    state = db.Column(db.String(50))      # ex: "São Paulo"
    city = db.Column(db.String(100))      # ex: "Campinas"
    address = db.Column(db.String(300))   # free-text full address

    duration_days = db.Column(db.Integer, nullable=False)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    status = db.Column(db.String(20), default="ativo")

    owner = db.relationship("User", back_populates="items")
    offers = db.relationship("Offer", back_populates="item", cascade="all, delete-orphan")

    # multiple images
    images = db.relationship(
        "ItemImage",
        backref="item",
        order_by="ItemImage.position",
        cascade="all, delete-orphan"
    )

    # ------------------------------
    # Helper properties/methods
    # ------------------------------
    @property
    def expires_at(self):
        return self.created_at + timedelta(days=self.duration_days)

    def is_expired(self):
        return datetime.utcnow() >= self.expires_at

    def get_primary_image(self):
        if self.images:
            return self.images[0].image_url
        return self.image_url

    def images_to_list(self, include_disabled: bool = False):
        imgs = self.images if include_disabled else [img for img in self.images if img.enabled]
        return [img.to_dict() for img in imgs]

    def format_location(self):
        parts = []
        if self.city and self.state:
            parts.append(f"{self.city}, {self.state}")
        if self.address and self.address.strip():
            parts.append(self.address.strip())
        
        return "  •  ".join(parts) or "Localização não informada"

    def __repr__(self):
        return f"<Item {self.title} ({self.status})>"

    def to_dict(self):
        data = {
            "id": self.id,
            "owner_id": self.owner_id,
            "owner_username": self.owner_username,
            "title": self.title,
            "description": self.description,
            "category": self.category,
            "image_url": self.get_primary_image(),
            "images": self.images_to_list(),
            "offer_type": self.offer_type,
            "volume": self.volume,

            "state": self.state,
            "city": self.city,
            "address": self.address,
            "location": self.format_location(),

            "duration_days": self.duration_days,
            "created_at": self.created_at.isoformat(),
            "status": self.status,
            "expires_at": self.expires_at.isoformat()
        }
        return data

    @staticmethod
    def get_by_id(item_id: int):
        if item_id is None:
            return None
        return Item.query.get(item_id)


class Offer(db.Model):
    __tablename__ = "offers"

    id = db.Column(db.Integer, primary_key=True)
    user_id = db.Column(db.Integer, db.ForeignKey("users.id"), nullable=False)
    user_name = db.Column(db.String(80), nullable=False)

    item_id = db.Column(db.Integer, db.ForeignKey("items.id"), nullable=False)
    price = db.Column(db.Float, nullable=False)

    message = db.Column(db.Text)
    status = db.Column(db.String(32), default="ativo")
    created_at = db.Column(db.DateTime, default=datetime.utcnow)

    owner_confirmed = db.Column(db.Boolean, default=False)
    bidder_confirmed = db.Column(db.Boolean, default=False)

    user = db.relationship("User", back_populates="offers")
    item = db.relationship("Item", back_populates="offers")

    def __repr__(self):
        return f"<Offer {self.id} by User {self.user_id} on Item {self.item_id}>"
    
    def to_dict(self):
        return {
            "id": self.id,
            "user_id": self.user_id,
            "user_name": self.user_name,
            "item_id": self.item_id,
            "price": self.price,
            "message": self.message,
            "status": self.status,
            "created_at": self.created_at.isoformat(),
            "owner_confirmed": self.owner_confirmed,
            "bidder_confirmed": self.bidder_confirmed
        }
    
    @staticmethod
    def get_by_id(offer_id: int):
        if offer_id is None:
            return None
        return Offer.query.get(offer_id)

    @staticmethod
    def allowed_statuses():
        return ["ativo", "pendendo_confirmacao"]

    @staticmethod
    def find_valid_user_offer_for_item(user_id: int, item_id: int):
        if not user_id or not item_id:
            return None
        return (
            Offer.query
                .filter(
                    Offer.user_id == user_id,
                    Offer.item_id == item_id,
                    Offer.status.in_(Offer.allowed_statuses())
                )
                .first()
        )
