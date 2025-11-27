# routes/location_routes.py
from flask import Blueprint, jsonify, request
from data.br_locations import BR_LOCATIONS
from utils.location import is_valid_state

location_bp = Blueprint("location", __name__, url_prefix="/locations")

# -----------------------------------------
# GET /api/locations/states
# -----------------------------------------
@location_bp.route("/states", methods=["GET"])
def get_states():
    """
    Returns all Brazilian state codes in alphabetical order.
    Example: ["AC", "AL", "AP", ...]
    """
    states = sorted(BR_LOCATIONS.keys())
    return jsonify(states), 200


# -----------------------------------------
# GET /api/locations/cities/<state>  ← legacy (single state)
# -----------------------------------------
@location_bp.route("/cities/<state>", methods=["GET"])
def get_cities_single(state):
    """
    Legacy endpoint: returns cities for one state.
    """
    state = state.upper()
    if not is_valid_state(state):
        return jsonify({"error": "Estado inválido ou não encontrado"}), 404
    return jsonify(BR_LOCATIONS[state]), 200


@location_bp.route("/cities", methods=["GET"])
def get_cities_multi():
    raw_states = request.args.get("states", "")
    if not raw_states:
        return jsonify({"error": "Parâmetro 'states' obrigatório"}), 400

    state_codes = [s.strip() for s in raw_states.split(",") if s.strip()]
    invalid_states = [s for s in state_codes if not is_valid_state(s)]
    valid_states = [s for s in state_codes if is_valid_state(s)]

    if not valid_states:
        return jsonify({"error": "Nenhum estado válido fornecido with a raw_states of "+  raw_states + ", and state_codes of "+ str(state_codes)}), 400

    result = {state: BR_LOCATIONS[state] for state in valid_states}

    # Sempre retorna apenas o objeto com cidades → frontend nunca quebra
    if invalid_states:
        # Opcional: log no servidor, mas não polui a resposta
        print(f"[LOCATION] Estados ignorados: {', '.join(invalid_states)}")
    
    return jsonify(result), 200