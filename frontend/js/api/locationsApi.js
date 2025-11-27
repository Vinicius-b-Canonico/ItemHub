// js/api/locationsApi.js
import { apiGet } from "./api.js";

const VERBOSE = true;
function v(...args) {
  if (VERBOSE) console.log("[LOCATIONS API DEBUG]", ...args);
}

// ======================================================
// GET /api/locations/states → List all Brazilian states
// ======================================================
export async function getStates() {
  v("getStates() called");
  return apiGet("/locations/states");
}



// js/api/locationsApi.js → substitua a função inteira
export async function getCitiesForStates(states = [], keepOriginalFormat=true) {
  v("getCitiesForStates() called with:", states);

  // Normaliza entrada
  if (!Array.isArray(states)) {
    states = states ? String(states).split(",").map(s => s.trim()).filter(Boolean) : [];
  }
  const uniqueStates = [...new Set(states.filter(Boolean))];

  if (uniqueStates.length === 0) {
    v("Nenhum estado válido → retornando array vazio");
    return [];
  }

  const params = new URLSearchParams();
  params.append("states", uniqueStates.join(","));

  v("Buscando cidades → /locations/cities?" + params.toString());
  const response = await apiGet(`/locations/cities?${params.toString()}`);

  // ========== PROTEÇÃO CONTRA RESPOSTAS INESPERADAS ==========
  if (!response || typeof response !== "object") {
    console.warn("Resposta inesperada do endpoint de cidades:", response);
    return [];
  }

  // Caso o backend retorne { data: {...}, warning: "..." }
  const data = response.data ?? response;

  if (!data || typeof data !== "object") {
    console.warn("Nenhum dado de cidades encontrado na resposta:", response);
    return [];
  }

  if (keepOriginalFormat) 
  {
    return data
  }
  const cities = [];

  for (const [state, cityList] of Object.entries(data)) {
    // Ignora chaves que não são estados (ex: "warning")
    if (!Array.isArray(cityList)) {
      v(`Ignorando chave não-array: ${state}`);
      continue;
    }

    cityList.forEach(city => {
      if (typeof city === "string") {
        cities.push({
          id: `${state}-${city}`,
          name: city,
          state: state,
          display: `${city} – ${state}`
        });
      }
    });
  }

  // Ordena por nome da cidade
  cities.sort((a, b) => a.name.localeCompare(b.name, "pt-BR"));

  v(`Retornando ${cities.length} cidades de ${uniqueStates.length} estado(s)`);
  return cities;
}


// ======================================================
// LEGACY: GET /api/locations/cities/<state> → Single state
// Keep for backward compatibility (e.g. item creation form)
// ======================================================
export async function getCities(state = "") {
  v("getCities() legacy called with:", state);
  if (!state || state.trim() === "") {
    throw new Error("State is required to fetch cities");
  }

  const out = await getCitiesForStates([state],false);
  const cityNames = out.map(city => city.name);

  return cityNames;
}


