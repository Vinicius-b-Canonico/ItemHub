import os
from flask import Flask
from flask_sqlalchemy import SQLAlchemy
from flask_migrate import Migrate
from flask_jwt_extended import JWTManager
from dotenv import load_dotenv
from config import Config  # <-- ADD THIS
from flask_cors import CORS
# Load environment variables from .env
load_dotenv()

from models import db
migrate = Migrate()
jwt = JWTManager()  # Initialize JWT manager

def create_app():
    """Factory function to create and configure the Flask app."""
    app = Flask(__name__)
    app.config.from_object(Config)  # <-- ADD THIS LINE

    # App Config which ovverids the file
    app.config["SQLALCHEMY_DATABASE_URI"] = os.getenv("DATABASE_URL")
    app.config["SQLALCHEMY_TRACK_MODIFICATIONS"] = False
    app.config["SECRET_KEY"] = os.getenv("SECRET_KEY")
    app.config["JWT_SECRET_KEY"] = os.getenv("JWT_SECRET_KEY", "jwt_dev_secret")
    app.config["JWT_TOKEN_LOCATION"] = ["cookies"]
    app.config["JWT_COOKIE_SECURE"] = False      # True in production (HTTPS only)
    app.config["JWT_COOKIE_SAMESITE"] = "Lax"    # or "Strict" for extra safety
    app.config["JWT_COOKIE_CSRF_PROTECT"] = False  # optional for localhost/dev

    CORS(
        app,
        supports_credentials=True,
        origins=[
            
            "http://localhost:8080",   # frontend served by nginx (docker)
            "http://127.0.0.1:8080",   # optional - covers both loopback forms
        ]
    )
    # Initialize extensions
    db.init_app(app)
    migrate.init_app(app, db)
    jwt.init_app(app)  # ✅ initialize JWT with the app
    # ========================
    # AUTO-SEED: só roda logo antes do primeiro requeste
    # ========================
    #@app.before_first_request
    #def run_seed_if_empty():
    #    from seed import seed_database
    #    seed_database(app)
    # Register Blueprints
    from routes.auth_routes import auth_bp
    from routes.item_routes import item_bp
    from routes.offer_routes import offer_bp
    from routes.location_routes import location_bp

    app.register_blueprint(auth_bp, url_prefix="/api/auth")
    app.register_blueprint(item_bp, url_prefix="/api/items")
    app.register_blueprint(offer_bp, url_prefix="/api/offers")
    app.register_blueprint(location_bp, url_prefix="/api/locations")
    print("Registered blueprints.")
    from commands import init_app as init_commands
    init_commands(app)
    return app


if __name__ == "__main__":
    print("running app.py directly")
    app = create_app()
    app.run(host="0.0.0.0", port=int(os.getenv("FLASK_RUN_PORT", 5887)))
