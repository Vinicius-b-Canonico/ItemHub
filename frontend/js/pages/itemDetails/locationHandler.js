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
    helpers.showAlert("danger", "Erro ao carregar estados do Brasil.");
  }
}

function setupStateAutocomplete() {
  stateInput.addEventListener("input", handleStateInput);
  document.addEventListener("click", (e) => {
    if (!stateInput.contains(e.target) && !stateSuggestions.contains(e.target)) {
      hideSuggestions(stateSuggestions);
    }
  });
}

function handleStateInput() {
  const query = stateInput.value.trim().toLowerCase();
  if (!query) {
    hideSuggestions(stateSuggestions);
    clearCityField();
    return;
  }

  const matches = allStates
    .filter(s => s.toLowerCase().includes(query))
    .slice(0, 8);

  showSuggestions(stateSuggestions, matches, (selected) => {
    stateInput.value = selected;
    hideSuggestions(stateSuggestions);
    loadCitiesForState(selected);
  });
}

async function loadCitiesForState(state) {
  if (!state) return clearCityField();

  cityInput.disabled = true;
  cityInput.placeholder = "Carregando cidades...";

  try {
    if (!allCitiesByState[state]) {
      allCitiesByState[state] = (await getCities(state)).sort();
    }
    cityInput.disabled = false;
    cityInput.placeholder = "Digite o nome da cidade...";
    cityInput.focus();
    setupCityAutocomplete(state);
  } catch (err) {
    helpers.showAlert("danger", `Erro ao carregar cidades de ${state}.`);
    cityInput.placeholder = "Erro ao carregar";
  }
}

function clearCityField() {
  cityInput.value = "";
  cityInput.disabled = true;
  cityInput.placeholder = "Primeiro escolha o estado";
  hideSuggestions(citySuggestions);
}

function setupCityAutocomplete(state) {
  cityInput.removeEventListener("input", cityInput._handler);
  const handler = () => {
    const query = cityInput.value.trim().toLowerCase();
    if (!query) return hideSuggestions(citySuggestions);

    const matches = (allCitiesByState[state] || [])
      .filter(c => c.toLowerCase().includes(query))
      .slice(0, 8);

    showSuggestions(citySuggestions, matches, (selected) => {
      cityInput.value = selected;
      hideSuggestions(citySuggestions);
      addressInput.focus();
    });
  };
  cityInput.addEventListener("input", handler);
  cityInput._handler = handler;
}

function showSuggestions(container, items, onSelect) {
  container.innerHTML = "";
  if (items.length === 0) {
    container.innerHTML = `<div class="p-2 text-muted small">Nenhum resultado</div>`;
    container.classList.add("show");
    return;
  }

  items.forEach(item => {
    const div = document.createElement("div");
    div.textContent = item;
    div.className = "px-3 py-2 hover-bg-light cursor-pointer";
    div.onclick = () => onSelect(item);
    container.appendChild(div);
  });
  container.classList.add("show");
}

function hideSuggestions(container) {
  container.classList.remove("show");
  setTimeout(() => container.innerHTML = "", 200);
}

export async function fillLocationFields(item) {
  if (!item.state) return;

  stateInput.value = item.state;
  addressInput.value = item.address || "";

  await loadCitiesForState(item.state);
  cityInput.value = item.city || "";
}

export function validateLocation() {
  const state = stateInput?.value.trim();
  const city = cityInput?.value.trim();
  const address = addressInput?.value.trim();

  if (!state || !city || !address) {
    helpers.showAlert("danger", "Estado, cidade e endereço completo são obrigatórios.");
    return false;
  }
  return true;
}