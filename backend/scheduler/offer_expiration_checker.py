import threading
import time
from datetime import datetime
from models import db, Item, Offer

CHECK_INTERVAL_SECONDS = 300  # 5 minutes

def check_expired_offers(app):
    """
    Periodically checks for expired item offers and updates their status.

    Business Rules:
    - Each item has an `expires_at` field set when created.
    - Once the expiration date passes:
        * If there are offers → select the best one and set item.status = "pendendo_confirmacao".
        * If no offers → mark item.status = "expired".
    - All offers belonging to expired items are also locked from new changes.

    This function runs continuously in a background thread.
    It uses the Flask app context to safely interact with the database.
    """
    with app.app_context():
        now = datetime.utcnow()
        expired_items = Item.query.filter(
            Item.status == "ativo",
            Item.expires_at < now
        ).all()

        for item in expired_items:
            offers = Offer.query.filter_by(item_id=item.id, status="active").all()

            if not offers:
                item.status = "espirado"
                print(f"[OFFER CHECKER] Item {item.id} expired with no offers.")
            else:
                # Select the "best" offer based on amount value
                # (highest offer wins if positive, lowest absolute value if negative)
                winning_offer = sorted(offers, key=lambda o: o.amount, reverse=True)[0]

                item.status = "pendendo_confirmacao"
                winning_offer.status = "pendendo_confirmacao"

                print(f"[OFFER CHECKER] Item {item.id} expired → "
                      f"Offer {winning_offer.id} set as pending confirmation.")

            db.session.commit()

    # Schedule next run
    threading.Timer(CHECK_INTERVAL_SECONDS, check_expired_offers, args=[app]).start()
