// locationHandler.js
import { getStates, getCities } from "../../api/locationsApi.js";
import * as helpers from "./helpers.js";

let allStates = [];
let allCitiesByState = {};

let stateInput, cityInput, addressInput, stateSuggestions, citySuggestions;

function initDOM() {
  stateInput = document.getElementById("state");
  cityInput = document.getElementById("city");
  addressInput = document.getElementById("address");
  stateSuggestions = document.getElementById("state-suggestions");
  citySuggestions = document.getElementById("city-suggestions");
}

export async function initLocationHandler() {
  initDOM();

  try {
    allStates = await getStates();
    setupStateAutocomplete();
  } catch (err) {
    console.error("Failed to load states:", err);
    helpers.showAlert("danger", "Erro ao carregar estados.");
  }
}

// STATE AUTOCOMPLETE
function setupStateAutocomplete() {
  stateInput.addEventListener("input", handleStateInput);

  document.addEventListener("click", (e) => {
    if (!stateInput.contains(e.target) && !stateSuggestions.contains(e.target)) {
      hideSuggestions(stateSuggestions);
    }
  });
}

function handleStateInput() {
  const query = stateInput.value.trim();
  if (!query) {
    hideSuggestions(stateSuggestions);
    clearCityField();
    return;
  }

  const matches = allStates
    .filter(s => s.toLowerCase().includes(query.toLowerCase()))
    .slice(0, 10);

  showSuggestions(stateSuggestions, matches, (selected) => {
    stateInput.value = selected;
    hideSuggestions(stateSuggestions);
    loadCitiesForState(selected);
  });
}

async function loadCitiesForState(state) {
  if (!state || state.trim() === "") {
    console.warn("loadCitiesForState called with empty state");
    clearCityField();
    return;
  }
    console.log("loadCitiesForState called with state: ", state);

  try {
    cityInput.disabled = true;
    cityInput.placeholder = "Carregando cidades...";
    cityInput.value = "";

    if (!allCitiesByState[state]) {
      console.log("Fetching cities for:", state);
      const cities = await getCities(state);
      allCitiesByState[state] = cities.sort();
    } else {
      console.log("Using cached cities for:", state);
    }

    cityInput.disabled = false;
    cityInput.placeholder = "Digite para buscar a cidade...";
    cityInput.focus();

    setupCityAutocomplete(state);
  } catch (err) {
    console.error("Failed to load cities for state:", state, err);
    helpers.showAlert("danger", `Erro ao carregar cidades para ${state}.`);
    cityInput.disabled = true;
    cityInput.placeholder = "Erro ao carregar cidades";
  }
}

function clearCityField() {
  cityInput.value = "";
  cityInput.disabled = true;
  cityInput.placeholder = "Primeiro escolha o estado";
  hideSuggestions(citySuggestions);
  allCitiesByState = {}; // optional: clear cache if state changes
}

// CITY AUTOCOMPLETE — now properly scoped
function setupCityAutocomplete(currentState) {
  // Remove old listener to prevent duplicates
  cityInput.removeEventListener("input", cityInput._cityHandler);

  const handler = () => {
    const query = cityInput.value.trim().toLowerCase();
    if (!query) {
      hideSuggestions(citySuggestions);
      return;
    }

    const cities = allCitiesByState[currentState] || [];
    const matches = cities
      .filter(c => c.toLowerCase().includes(query))
      .slice(0, 10);

    showSuggestions(citySuggestions, matches, (selected) => {
      cityInput.value = selected;
      hideSuggestions(citySuggestions);
      addressInput.focus();
    });
  };

  cityInput.addEventListener("input", handler);
  cityInput._cityHandler = handler; // store for removal

  // Click outside
  document.addEventListener("click", (e) => {
    if (!cityInput.contains(e.target) && !citySuggestions.contains(e.target)) {
      hideSuggestions(citySuggestions);
    }
  });
}

// SHARED UI
function showSuggestions(container, items, onSelect) {
  container.innerHTML = "";
  if (items.length === 0) {
    container.innerHTML = '<div class="text-muted p-2">Nenhum resultado</div>';
    container.style.display = "block";
    return;
  }

  items.forEach(item => {
    const div = document.createElement("div");
    div.textContent = item;
    div.addEventListener("click", () => onSelect(item));
    div.addEventListener("mousemove", () => {
      container.querySelectorAll("div").forEach(d => d.classList.remove("active"));
      div.classList.add("active");
    });
    container.appendChild(div);
  });

  container.style.display = "block";
}

function hideSuggestions(container) {
  container.style.display = "none";
  container.innerHTML = "";
}

export async function fillLocationFields(item) {
  if (!item.state) return;

  // Fill state & address immediately
  stateInput.value = item.state || "";
  addressInput.value = item.address || "";

  try {
    // Wait for cities to be loaded and autocomplete to be set up
    await loadCitiesForState(item.state);

    // NOW it's safe to set the city value
    cityInput.value = item.city || "";
    cityInput.disabled = false;
    cityInput.placeholder = "Digite para buscar a cidade...";
  } catch (err) {
    console.error("Failed to load cities when editing:", err);
    cityInput.disabled = true;
    cityInput.placeholder = "Erro ao carregar cidades";
  }
}


export function collectLocationData() {
  return {
    state: stateInput.value.trim(),
    city: cityInput.value.trim(),
    address: addressInput.value.trim(),
  };
}

export function validateLocation() {
  const { state, city, address } = collectLocationData();
  if (!state || !city || !address) {
    helpers.showAlert("danger", "Estado, cidade e endereço são obrigatórios.");
    return false;
  }
  return true;
}