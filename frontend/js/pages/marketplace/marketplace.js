// js/pages/marketplace/marketplace.js
import { listItems, getItemCategories, deleteItem } from "../../api/itemsApi.js";
import { getStates, getCitiesForStates } from "../../api/locationsApi.js";
import { getOffersForItem, getMyOffers } from "../../api/offersApi.js";
import { getCurrentUser } from "../../api/authApi.js";
import { loadNavbar } from "../../components/navbar.js";
import { renderItemCard } from "../../components/itemCard.js";
import { openViewOffersModal, openOfferDetailsModal } from "../../components/offersModals.js";

document.addEventListener("DOMContentLoaded", async () => {
  loadNavbar();
  let currentUser = null;
  try {
    currentUser = await getCurrentUser();
  } catch (_) {}
  let userOfferIdByItemId = {};
  async function loadUserOffersMap() {
    if (!currentUser) return;

    try {
      const myOffers = await getMyOffers();
      userOfferIdByItemId = {};

      myOffers.forEach(entry => {
        if (entry.item && entry.offer) {
          userOfferIdByItemId[entry.item.id] = entry.offer.id;
        }
      });
    } catch (err) {
      console.warn("Não foi possível carregar as ofertas do usuário (normal em dev):", err);
    }
  }

  // ==============================================================
  // DOM References
  // ==============================================================
  const DOM = {
    grid: document.getElementById("items-grid"),
    loading: document.getElementById("loading"),
    noResults: document.getElementById("no-results"),
    resultsInfo: document.getElementById("results-info"),
    pagination: document.getElementById("pagination"),
    sortSelect: document.getElementById("sort-select"),
    applyFiltersBtn: document.querySelector("#filters-form button[type='submit']"),
    clearFiltersBtn: document.getElementById("clear-filters"),
    //applyMobileBtn: document.getElementById("apply-mobile-filters"),

    // Filtros
    searchInput: document.getElementById("search-input"),
    nationwide: document.getElementById("nationwide"),
    stateSearch: document.getElementById("state-search"),
    citySearch: document.getElementById("city-search"),
    categorySearch: document.getElementById("category-search"),

    selectedStatesChips: document.getElementById("selected-states-chips"),
    selectedCitiesChips: document.getElementById("selected-cities-chips"),
    selectedCategoriesChips: document.getElementById("selected-categories-chips"),

    stateSuggestions: document.getElementById("state-suggestions"),
    citySuggestions: document.getElementById("city-suggestions"),
    categorySuggestions: document.getElementById("category-suggestions"),

    specificCitiesWrapper: document.getElementById("specific-cities-wrapper"),
    filterSpecificCities: document.getElementById("filter-specific-cities"),
    citiesInputWrapper: document.getElementById("cities-input-wrapper"),
  };

  let currentPage = 1;

  // Dados
  let allStates = [];
  let allCategories = []; // [{ id, name }]
  const selectedStates = new Set();
  const selectedCities = new Set();
  const selectedCategories = new Set();

  // ==============================================================
  // Carregamento inicial
  // ==============================================================
  await Promise.all([loadStates(), loadCategories()]);

  async function loadStates() {
    allStates = await getStates();
  }

  async function loadCategories() {
    const cats = await getItemCategories();
    allCategories = cats.map(cat => ({
      id: typeof cat === "object" ? cat.id || cat : cat,
      name: typeof cat === "object" ? cat.name || cat : cat
    }));
  }

  // ==============================================================
  // Chips
  // ==============================================================
  function addSmallChip(container, text, value, type) {
    const chip = document.createElement("span");
    chip.className = "chip-small me-1";
    chip.innerHTML = `${text} <button type="button" data-value="${value}" data-type="${type}">×</button>`;
    container.appendChild(chip);
  }

  function renderChips() {
    DOM.selectedStatesChips.innerHTML = "";
    DOM.selectedCitiesChips.innerHTML = "";
    DOM.selectedCategoriesChips.innerHTML = "";

    selectedStates.forEach(state => {
      const short = state.length > 10 ? state.substring(0, 8) + "..." : state;
      addSmallChip(DOM.selectedStatesChips, short, state, "state");
    });

    selectedCities.forEach(city => {
      const short = city.length > 12 ? city.substring(0, 10) + "..." : city;
      addSmallChip(DOM.selectedCitiesChips, short, city, "city");
    });

    selectedCategories.forEach(catId => {
      const cat = allCategories.find(c => c.id === catId);
      if (cat) {
        const short = cat.name.length > 12 ? cat.name.substring(0, 10) + "..." : cat.name;
        addSmallChip(DOM.selectedCategoriesChips, short, catId, "category");
      }
    });
  }

  // ==============================================================
  // FUNÇÃO CENTRALIZADA DE AUTOCOMPLETE (versão final com acentos + relevância)
  // ==============================================================
  function normalize(str) {
    return str
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .toLowerCase();
  }

  function setupAutocomplete({
    inputEl,
    suggestionsEl,
    getCandidates,
    isSelected,
    getValue,
    getLabel,
    onSelect,
    maxSuggestions = 10
  }) {
    inputEl.addEventListener("input", async () => {
      const term = inputEl.value.trim();
      suggestionsEl.innerHTML = "";

      if (!term) {
        suggestionsEl.classList.add("d-none");
        return;
      }

      const normalizedTerm = normalize(term);
      const candidates = await getCandidates();

      let filtered = candidates
        .filter(item => {
          const label = typeof item === "string" ? item : (item.name || "");
          return normalize(label).includes(normalizedTerm);
        })
        .filter(item => !isSelected(item));

      // Prioriza quem começa com o termo (ex: "sa" → São Paulo antes de Osasco)
      filtered.sort((a, b) => {
        const labelA = normalize(typeof a === "string" ? a : a.name || "");
        const labelB = normalize(typeof b === "string" ? b : b.name || "");

        const startsWithA = labelA.startsWith(normalizedTerm);
        const startsWithB = labelB.startsWith(normalizedTerm);

        if (startsWithA && !startsWithB) return -1;
        if (!startsWithA && startsWithB) return 1;
        return 0;
      });

      filtered = filtered.slice(0, maxSuggestions);

      if (filtered.length === 0) {
        suggestionsEl.classList.add("d-none");
        return;
      }

      filtered.forEach(item => {
        const div = document.createElement("div");
        div.textContent = getLabel(item);
        div.onclick = () => {
          onSelect(item);
          inputEl.value = "";
          suggestionsEl.classList.add("d-none");
        };
        suggestionsEl.appendChild(div);
      });

      suggestionsEl.classList.remove("d-none");
    });

    // Fecha ao clicar fora
    document.addEventListener("click", e => {
      if (!inputEl.contains(e.target) && !suggestionsEl.contains(e.target)) {
        suggestionsEl.classList.add("d-none");
      }
    });
  }

  // ==============================================================
  // Estados
  // ==============================================================
  setupAutocomplete({
    inputEl: DOM.stateSearch,
    suggestionsEl: DOM.stateSuggestions,
    getCandidates: () => allStates,
    isSelected: state => selectedStates.has(state),
    getValue: state => state,
    getLabel: state => state,
    onSelect: state => {
      selectedStates.add(state);
      DOM.specificCitiesWrapper.classList.remove("d-none");
      renderChips();
    }
  });

  // ==============================================================
  // Cidades
  // ==============================================================
  setupAutocomplete({
    inputEl: DOM.citySearch,
    suggestionsEl: DOM.citySuggestions,
    getCandidates: async () => {
      if (selectedStates.size === 0) return [];
      const statesArray = Array.from(selectedStates);
      const citiesMap = await getCitiesForStates(statesArray);
      return statesArray.flatMap(state => citiesMap[state] || []);
    },
    isSelected: city => selectedCities.has(city),
    getValue: city => city,
    getLabel: city => city,
    maxSuggestions: 100,
    onSelect: city => {
      selectedCities.add(city);
      renderChips();
    }
  });

  DOM.filterSpecificCities.addEventListener("change", () => {
    DOM.citiesInputWrapper.classList.toggle("d-none", !DOM.filterSpecificCities.checked);
    if (!DOM.filterSpecificCities.checked) selectedCities.clear();
    renderChips();
  });

  // ==============================================================
  // Categorias (chip-based)
  // ==============================================================
  // Categorias
  setupAutocomplete({
    inputEl: DOM.categorySearch,
    suggestionsEl: DOM.categorySuggestions,
    getCandidates: () => allCategories,
    isSelected: cat => selectedCategories.has(cat.id),
    getValue: cat => cat.id,
    getLabel: cat => cat.name,
    maxSuggestions: 100,
    onSelect: cat => {
      selectedCategories.add(cat.id);
      renderChips();
    }
  });
  // ==============================================================
  // Remover chip
  // ==============================================================
  document.addEventListener("click", e => {
    const btn = e.target.closest("button[data-type]");
    if (!btn) return;

    const value = btn.dataset.value;
    const type = btn.dataset.type;

    if (type === "state") {
      selectedStates.delete(value);
      if (selectedStates.size === 0) {
        DOM.specificCitiesWrapper.classList.add("d-none");
        DOM.filterSpecificCities.checked = false;
        DOM.citiesInputWrapper.classList.add("d-none");
        selectedCities.clear();
      }
    } else if (type === "city") {
      selectedCities.delete(value);
    } else if (type === "category") {
      selectedCategories.delete(value);
    }
    renderChips();
  });

  // ==============================================================
  // Filtros atuais
  // ==============================================================
  function getCurrentFilters() {
    const types = ["free", "pay", "paid_to_take"]
      .filter(t => document.getElementById(`type-${t}`)?.checked)
      .join(",");

    const search = DOM.searchInput?.value.trim() || undefined;
    const isNationwide = DOM.nationwide.checked;
    const states = isNationwide ? [] : Array.from(selectedStates);
    const cities = isNationwide || !DOM.filterSpecificCities.checked ? [] : Array.from(selectedCities);
    const categories = Array.from(selectedCategories);

    return { search, types, categories, states, cities };
  }

  // ==============================================================
  // Busca + Render
  // ==============================================================
  async function fetchAndRender(page = 1) {
    showLoading();
    currentPage = page;
    const { search, types, categories, states, cities } = getCurrentFilters();

    const result = await listItems({
      search,
      offer_type: types || undefined,
      categories: categories.length ? categories : undefined,
      states: states.length ? states : undefined,
      cities: cities.length ? cities : undefined,
      page,
      page_size: 20,
    });

    DOM.resultsInfo.textContent = `${result.total_items || 0} ite${result.total_items === 1 ? "m" : "ns"}`;
    DOM.grid.innerHTML = "";
    (result.items || []).forEach(item => {
      const userOfferId = userOfferIdByItemId[item.id] || 0;
      DOM.grid.insertAdjacentHTML(
        "beforeend",
        renderItemCard(item, currentUser, false, userOfferId));
    });
    renderPagination(result.total_pages || 1, page);
    hideLoading();
    DOM.noResults.classList.toggle("d-none", !!(result.items?.length));
  }

  function renderPagination(totalPages, current) {
    DOM.pagination.innerHTML = "";
    if (totalPages <= 1) return;
    for (let i = 1; i <= totalPages; i++) {
      const li = document.createElement("li");
      li.className = `page-item ${i === current ? "active" : ""}`;
      li.innerHTML = `<a class="page-link" href="#" data-page="${i}">${i}</a>`;
      DOM.pagination.appendChild(li);
    }
  }

  function showLoading() {
    DOM.loading.classList.remove("d-none");
    DOM.noResults.classList.add("d-none");
  }
  function hideLoading() {
    DOM.loading.classList.add("d-none");
  }

  // ==============================================================
  // Eventos
  // ==============================================================
  DOM.applyFiltersBtn.addEventListener("click", e => {
    e.preventDefault();
    fetchAndRender(1);
  });

  //DOM.applyMobileBtn.addEventListener("click", () => {
  //  const offcanvas = bootstrap.Offcanvas.getInstance(document.getElementById("mobileFilters"))
  //                 || new bootstrap.Offcanvas(document.getElementById("mobileFilters"));
  //  offcanvas.hide();
  //  fetchAndRender(1);
  //});

  DOM.sortSelect.addEventListener("change", () => fetchAndRender(currentPage));

  DOM.clearFiltersBtn.addEventListener("click", () => {
    document.querySelectorAll("input[type=checkbox]").forEach(cb => cb.checked = false);
    DOM.searchInput.value = "";
    DOM.stateSearch.value = "";
    DOM.citySearch.value = "";
    DOM.categorySearch.value = "";
    selectedStates.clear();
    selectedCities.clear();
    selectedCategories.clear();
    DOM.specificCitiesWrapper.classList.add("d-none");
    DOM.citiesInputWrapper.classList.add("d-none");
    renderChips();
    fetchAndRender(1);
  });

  DOM.pagination.addEventListener("click", e => {
    const link = e.target.closest(".page-link");
    if (link) {
      e.preventDefault();
      const page = Number(link.dataset.page);
      fetchAndRender(page);
      window.scrollTo({ top: 0, behavior: "smooth" });
    }
  });

  DOM.nationwide.addEventListener("change", () => {
    if (DOM.nationwide.checked) {
      selectedStates.clear();
      selectedCities.clear();
      DOM.filterSpecificCities.checked = false;
      DOM.citiesInputWrapper.classList.add("d-none");
      DOM.specificCitiesWrapper.classList.add("d-none");
      renderChips();
    }
  });

  // ==============================================================
  // Card Actions
  // ==============================================================
  DOM.grid.addEventListener("click", async e => {
    const btn = e.target.closest("[data-action]");
    if (!btn) return;
    const { action, id, offerId } = btn.dataset;
    if (!id) return;

    switch (action) {
      case "view": location.href = `itemDetails.html?mode=view&id=${id}`; break;
      case "edit": location.href = `itemDetails.html?mode=edit&id=${id}`; break;
      case "delete":
        if (confirm("Tem certeza que quer excluir este anúncio?")) {
          try {
            await deleteItem(id);
            document.querySelector(`[data-item-id="${id}"]`)?.closest(".col")?.remove();
          } catch (err) {
            alert("Erro ao excluir.");
          }
        }
        break;
      case "view-offers": openViewOffersModal(id); break;
      case "make-offer": openOfferDetailsModal(id, null); break;
      case "edit-offer":
        const offers = await getOffersForItem(id);
        const existing = offers.find(o => String(o.id) === String(offerId));
        openOfferDetailsModal(id, existing);
        break;
    }
  });

  // ==============================================================
  // Primeira carga
  // ==============================================================
  await loadUserOffersMap();
  fetchAndRender(1);
});