from flask import Blueprint, jsonify
from data.br_locations import BR_LOCATIONS
from utils.location import is_valid_state
location_bp = Blueprint("location", __name__)



# -----------------------------------------
# Endpoints
# -----------------------------------------

@location_bp.route("/states", methods=["GET"])
def get_states():
    """
    Returns all states in alphabetical order.
    """
    states = sorted(BR_LOCATIONS.keys())
    return jsonify(states), 200


@location_bp.route("/cities/<state>", methods=["GET"])
def get_cities(state):
    """
    Returns all cities from the given state.
    """
    if not is_valid_state(state):
        return jsonify({"error": "State not found"}), 404

    return jsonify(BR_LOCATIONS[state]), 200
