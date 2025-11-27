from flask import Blueprint, request, jsonify
from werkzeug.security import generate_password_hash, check_password_hash
from flask_jwt_extended import create_access_token, jwt_required, get_jwt_identity
from models import db, User
from datetime import timedelta
from flask_jwt_extended import set_access_cookies, unset_jwt_cookies
auth_bp = Blueprint("auth", __name__)

@auth_bp.route("/register", methods=["POST"])
def register():
    """
    POST /api/auth/register
    -----------------------

    Registers a new user in the system.

    **Expected JSON body:**
    ```json
    {
        "username": "john_doe",
        "email": "john@example.com",
        "password": "secret123",
        "full_name": "John Doe"   // not being sent by frontend yet
    }
    ```

    **Business rules & logic:**
    - All fields except `full_name` are required.
    - Usernames and emails must be unique — duplicates trigger a 409 conflict.
    - Passwords are securely hashed using Werkzeug’s `generate_password_hash`.
    - On success, the new user is committed to the database.

    **Responses:**
    - `201 CREATED` → user successfully created.
    - `400 BAD REQUEST` → missing required fields.
    - `409 CONFLICT` → username or email already taken.

    **Notes:**
    - Passwords are never returned to the client.
    - JWT token is *not* automatically issued here — users must log in after registering.
    """
    data = request.get_json()

    if not data or "username" not in data or "password" not in data or "email" not in data:
        return jsonify({"error": "Missing required fields"}), 400

    if User.query.filter((User.username == data["username"]) | (User.email == data["email"])).first():
        return jsonify({"error": "Username or email already taken"}), 409

    hashed_pw = generate_password_hash(data["password"])
    user = User(
        username=data["username"],
        email=data["email"],
        password_hash=hashed_pw,
        full_name=data.get("full_name")
    )
    db.session.add(user)
    db.session.commit()

    return jsonify({"message": "User registered successfully"}), 201

@auth_bp.route("/login", methods=["POST"])
def login():
    data = request.get_json()
    user:User = User.query.filter_by(username=data.get("username")).first()

    if not user or not check_password_hash(user.password_hash, data.get("password")):
        return jsonify({"error": "Invalid credentials"}), 401

    access_token = create_access_token(identity=str(user.id), expires_delta=timedelta(hours=6))
    resp = jsonify({
        "message": "Login successful",
        "user": user.to_dict()
    })
    set_access_cookies(resp, access_token)
    return resp, 200

@auth_bp.route("/logout", methods=["POST"])
def logout():
    resp = jsonify({"message": "Logged out"})
    unset_jwt_cookies(resp)
    return resp, 200

@auth_bp.route("/me", methods=["GET"])
@jwt_required()
def me():
    """
    GET /api/auth/me
    ----------------

    Returns the profile information of the currently authenticated user.

    **Authentication:**
    - Requires a valid `Authorization: Bearer <token>` header.
    - The JWT token must have been issued by the `/login` endpoint.

    **Business rules & logic:**
    - Decodes the JWT token to extract the `user_id`.
    - Retrieves the user from the database.
    - Returns basic profile info.

    **Responses:**
    - `200 OK` → returns user profile.
    - `401 UNAUTHORIZED` → missing or invalid token.

    **Example successful response:**
    ```json
    {
        "id": 1,
        "username": "john_doe",
        "email": "john@example.com",
        "full_name": "John Doe",
        "created_at": "2025-11-07T12:45:33.251Z"
    }
    ```

    **Notes:**
    - This endpoint is primarily used by the frontend on page reload to restore the logged-in user’s session.
    - No sensitive data (like password hashes) is ever returned.
    """
    user_id = int(get_jwt_identity())
    user:User = User.get_by_id(user_id)
    if not user:
        #has a jwt identity but its not registered on base
        return jsonify({"error": "not propperly logged in"}), 401
    return jsonify(user.to_dict())
