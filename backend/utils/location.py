from data.br_locations import BR_LOCATIONS

# -----------------------------------------
# Core validation helpers (used everywhere)
# -----------------------------------------

def is_valid_state(state: str) -> bool:
    """
    Returns True if the given string exactly matches a state key.
    """
    return state in BR_LOCATIONS


def is_valid_city(state: str, city: str) -> bool:
    """
    Returns True if:
    - state exists in BR_LOCATIONS
    - the city matches one of the known cities for that state
    """
    if state not in BR_LOCATIONS:
        return False

    return city in BR_LOCATIONS[state]
