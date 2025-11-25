import { apiGet } from "./api.js";

const VERBOSE = true;
function v(...args) {
  if (VERBOSE) console.log("[ITEMS API DEBUG]", ...args);
}

// ======================================================
// GET /api/locations/states - List all states
// ======================================================
export async function getStates() {
  v("getStates() called");

  // No parameters for this endpoint
  return apiGet("/locations/states");
}


// ======================================================
// GET /api/locations/cities/<state> - Get cities for a state
// ======================================================
export async function getCities(state = "") {
  v("getCities() called with:", { state });

  if (!state || state.trim() === "") {
    throw new Error("State is required to fetch cities");
  }

  const encodedState = encodeURIComponent(state.trim());

  v("Fetching cities from:", `/locations/cities/${encodedState}`);

  return apiGet(`/locations/cities/${encodedState}`);
}