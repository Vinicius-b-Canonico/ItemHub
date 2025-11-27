// js/pages/marketplace/marketplace.js
import { listItems, getItemCategories, deleteItem } from "../../api/itemsApi.js";
import { getStates, getCitiesForStates } from "../../api/locationsApi.js";
import { getOffersForItem } from "../../api/offersApi.js"; 
import { getCurrentUser } from "../../api/authApi.js";
import { loadNavbar } from "../../components/navbar.js";
import { renderItemCard } from "../../components/itemCard.js";
import { openViewOffersModal, openOfferDetailsModal } from "../../components/offersModals.js";

document.addEventListener("DOMContentLoaded", async () => {
  // ==============================================================
  // 1. Navbar + Usuário
  // ==============================================================
  loadNavbar();
  let currentUser = null;
  try {
    currentUser = await getCurrentUser();
  } catch (_) {}

  // ==============================================================
  // 2. Referências DOM
  // ==============================================================
  const DOM = {
    form: document.getElementById("filters-form"),
    grid: document.getElementById("items-grid"),
    loading: document.getElementById("loading"),
    noResults: document.getElementById("no-results"),
    resultsInfo: document.getElementById("results-info"),
    pagination: document.getElementById("pagination"),
    sortSelect: document.getElementById("sort-select"),

    // Location
    nationwide: document.getElementById("nationwide"),
    stateSearch: document.getElementById("state-search"),
    citySearch: document.getElementById("city-search"),
    selectedStatesChips: document.getElementById("selected-states-chips"),
    selectedCitiesChips: document.getElementById("selected-cities-chips"),
    stateSuggestions: document.getElementById("state-suggestions"),
    citySuggestions: document.getElementById("city-suggestions"),
    specificCitiesWrapper: document.getElementById("specific-cities-wrapper"),
    filterSpecificCities: document.getElementById("filter-specific-cities"),
    citiesInputWrapper: document.getElementById("cities-input-wrapper"),

    categoriesContainer: document.getElementById("categories-container"),
    mobileContent: document.getElementById("mobile-filters-content"),
    applyMobile: document.getElementById("apply-mobile-filters"),
  };

  let currentPage = 1;

  // Dados
  let allStates = [];                    // ["São Paulo", "Rio de Janeiro", ...]
  let citiesByState = new Map();         // "São Paulo" → ["Campinas", "Santos", ...]
  const selectedStates = new Set();      // Set<string>
  const selectedCities = new Set();      // Set<string>

  // ==============================================================
  // 3. Carregamento inicial
  // ==============================================================
  await Promise.all([loadStates(), loadCategories()]);

  async function loadStates() {
    allStates = await getStates(); // → array de strings
  }

  async function loadCategories() {
    const cats = await getItemCategories();
    DOM.categoriesContainer.innerHTML = "";
    cats.forEach(cat => {
      const value = typeof cat === "object" ? cat.id || cat : cat;
      const name = typeof cat === "object" ? cat.name || cat : cat;
      const div = document.createElement("div");
      div.className = "form-check mb-2";
      div.innerHTML = `
        <input class="form-check-input" type="checkbox" value="${value}" id="cat-${value}">
        <label class="form-check-label" for="cat-${value}">${name}</label>
      `;
      DOM.categoriesContainer.appendChild(div);
    });
  }

  // ==============================================================
  // 4. Chips pequenos (ao lado do título)
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

    selectedStates.forEach(state => {
      const short = state.length > 10 ? state.substring(0, 8) + "..." : state;
      addSmallChip(DOM.selectedStatesChips, short, state, "state");
    });

    selectedCities.forEach(city => {
      const short = city.length > 12 ? city.substring(0, 10) + "..." : city;
      addSmallChip(DOM.selectedCitiesChips, short, city, "city");
    });
  }

  // ==============================================================
  // 5. Estados – busca + chip
  // ==============================================================
  DOM.stateSearch.addEventListener("input", () => {
    const term = DOM.stateSearch.value.trim().toLowerCase();
    DOM.stateSuggestions.innerHTML = "";

    if (!term) {
      DOM.stateSuggestions.classList.add("d-none");
      return;
    }

    const filtered = allStates
      .filter(s => s.toLowerCase().includes(term))
      .filter(s => !selectedStates.has(s))
      .slice(0, 10);

    if (filtered.length === 0) {
      DOM.stateSuggestions.classList.add("d-none");
      return;
    }

    filtered.forEach(state => {
      const div = document.createElement("div");
      div.textContent = state;
      div.onclick = () => {
        selectedStates.add(state);
        DOM.stateSearch.value = "";
        DOM.stateSuggestions.classList.add("d-none");
        DOM.specificCitiesWrapper.classList.remove("d-none"); // mostra opção de cidades
        renderChips();
      };
      DOM.stateSuggestions.appendChild(div);
    });

    DOM.stateSuggestions.classList.remove("d-none");
  });

  // ==============================================================
  // 6. Cidades – só aparece se tiver estado + checkbox ativado
  // ==============================================================
  DOM.filterSpecificCities.addEventListener("change", () => {
    DOM.citiesInputWrapper.classList.toggle("d-none", !DOM.filterSpecificCities.checked);
    if (!DOM.filterSpecificCities.checked) {
      selectedCities.clear();
      renderChips();
    }
  });

  DOM.citySearch.addEventListener("input", async () => {
    const term = DOM.citySearch.value.trim().toLowerCase();
    DOM.citySuggestions.innerHTML = "";

    if (!term || selectedStates.size === 0) {
      DOM.citySuggestions.classList.add("d-none");
      return;
    }

    const statesArray = Array.from(selectedStates);
    const citiesMap = await getCitiesForStates(statesArray);
    
    const available = [];
    statesArray.forEach(state => {
      const list = citiesMap[state] || [];
      available.push(...list.filter(c => !selectedCities.has(c)));
    });

    const filtered = available
      .filter(c => c.toLowerCase().includes(term))
      .slice(0, 12);

    if (filtered.length === 0) {
      DOM.citySuggestions.classList.add("d-none");
      return;
    }

    filtered.forEach(city => {
      const div = document.createElement("div");
      div.textContent = city;
      div.onclick = () => {
        selectedCities.add(city);
        DOM.citySearch.value = "";
        DOM.citySuggestions.classList.add("d-none");
        renderChips();
      };
      DOM.citySuggestions.appendChild(div);
    });

    DOM.citySuggestions.classList.remove("d-none");
  });

  // ==============================================================
  // 7. Remover chip
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
    }

    renderChips();
  });

  // ==============================================================
  // 8. Filtros atuais
  // ==============================================================
  function getCurrentFilters() {
    const types = ["free", "pay", "paid_to_take"]
      .filter(t => document.getElementById(`type-${t}`)?.checked)
      .join(",");

    const catChecks = DOM.categoriesContainer.querySelectorAll("input[type=checkbox]:checked");
    const categories = Array.from(catChecks).map(c => c.value);

    const isNationwide = DOM.nationwide.checked;

    const states = isNationwide ? [] : Array.from(selectedStates);
    const cities = isNationwide || !DOM.filterSpecificCities.checked ? [] : Array.from(selectedCities);

    return { types, categories, states, cities };
  }

  // ==============================================================
  // 9. Busca + Renderização
  // ==============================================================
  async function fetchAndRender(page = 1) {
    showLoading();
    currentPage = page;

    const { types, categories, states, cities } = getCurrentFilters();

    const result = await listItems({
      offer_type: types || undefined,
      categories: categories.length ? categories : undefined,
      states: states.length ? states : undefined,
      cities: cities.length ? cities : undefined,
      page,
      page_size: 20,
    });

    DOM.resultsInfo.textContent = `${result.total_items || 0} ite${result.total_items === 1 ? "m" : "ms"}`;
    DOM.grid.innerHTML = "";
    (result.items || []).forEach(item => {
      DOM.grid.insertAdjacentHTML("beforeend", renderItemCard(item, currentUser, false, item.existing_offer_id || 0));
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
  // 10. Eventos gerais
  // ==============================================================
  DOM.form.addEventListener("submit", e => {
    e.preventDefault();
    fetchAndRender(1);
  });

  DOM.sortSelect.addEventListener("change", () => fetchAndRender(currentPage));

  document.getElementById("clear-filters").addEventListener("click", () => {
    DOM.form.reset();
    DOM.nationwide.checked = false;
    selectedStates.clear();
    selectedCities.clear();
    DOM.filterSpecificCities.checked = false;
    DOM.citiesInputWrapper.classList.add("d-none");
    DOM.specificCitiesWrapper.classList.add("d-none");
    DOM.stateSearch.value = "";
    DOM.citySearch.value = "";
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

  // Todo o Brasil limpa tudo
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
  // 11. Mobile Offcanvas
  // ==============================================================
  const sidebar = document.querySelector("#filters-sidebar .bg-white") || document.querySelector("#filters-sidebar");
  if (sidebar && DOM.mobileContent) {
    DOM.mobileContent.innerHTML = sidebar.innerHTML;
  }

  DOM.applyMobile.addEventListener("click", () => {
    const offcanvas = bootstrap.Offcanvas.getInstance(document.getElementById("mobileFilters"))
                   || new bootstrap.Offcanvas(document.getElementById("mobileFilters"));
    offcanvas.hide();
    fetchAndRender(1);
  });

  // ==============================================================
  // 12. Primeira carga
  // ==============================================================
  fetchAndRender(1);

  // ==============================================================
  // 13. Event Delegation para os botões dos cards (dentro do grid)
  // ==============================================================
  DOM.grid.addEventListener("click", async e => {
    const btn = e.target.closest("[data-action]");
    if (!btn) return;

    const { action, id, offerId } = btn.dataset;

    // Evita ações em cards que ainda estão carregando ou foram removidos
    if (!id) return;

    switch (action) {
      case "view":
        window.location.href = `itemDetails.html?mode=view&id=${id}`;
        break;

      case "edit":
        window.location.href = `itemDetails.html?mode=edit&id=${id}`;
        break;

      case "delete":
        if (confirm("Tem certeza que quer excluir este anúncio?")) {
          try {
            await deleteItem(id); // você já tem essa função importada em outro lugar? se não, importa!
            document.querySelector(`[data-item-id="${id}"]`)?.closest(".col")?.remove();
            // Opcional: atualiza contador
            const currentCount = parseInt(DOM.resultsInfo.textContent.match(/\d+/)?.[0] || 0);
            DOM.resultsInfo.textContent = `${currentCount - 1} item${currentCount - 1 === 1 ? "" : "ns"}`;
          } catch (err) {
            console.error(err);
            alert("Erro ao excluir o anúncio. Tente novamente.");
          }
        }
        break;

      case "view-offers":
        openViewOffersModal(id);
        break;

      case "make-offer":
        openOfferDetailsModal(id, null);
        break;

      case "edit-offer":
        try {
          const offers = await getOffersForItem(id); // você tem essa função? se não, importa!
          const existing = offers.find(o => String(o.id) === String(offerId));
          openOfferDetailsModal(id, existing);
        } catch (err) {
          console.error(err);
          alert("Erro ao carregar proposta.");
        }
        break;

      default:
        console.warn("Ação não reconhecida:", action);
    }
  });
});