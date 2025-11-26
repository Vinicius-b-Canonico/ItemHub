// js/pages/marketplace/state.js
import { getCurrentUser } from "../../api/authApi.js";
import { getItemCategories } from "../../api/itemsApi.js";
import { getMyOffers } from "../../api/offersApi.js";
import { loadCategoriesIntoSelect } from "./filters.js";

export const MPState = {
  itemsContainer: null,
  alertContainer: null,
  filterForm: null,
  clearBtn: null,
  paginationContainer: null,
  itemsSummary: null,

  currentUser: null,
  page: 1,
  pageSize: 20,
  totalPages: 1,
  totalItems: 0,
  isLoading: false,

  myOffersByItemId: {}
};

export async function initState() {
  MPState.itemsContainer = document.querySelector("#itemsContainer");
  MPState.alertContainer = document.querySelector("#alertContainer");
  MPState.filterForm = document.querySelector("#filterForm");
  MPState.clearBtn = document.querySelector("#clearFiltersBtn");
  MPState.paginationContainer = document.querySelector("#paginationContainer");
  MPState.itemsSummary = document.querySelector("#itemsSummary");

  const urlParams = new URLSearchParams(window.location.search);
  const p = parseInt(urlParams.get("page"), 10);
  const ps = parseInt(urlParams.get("page_size"), 10);

  if (!Number.isNaN(p) && p > 0) MPState.page = p;
  if (!Number.isNaN(ps) && [12, 20, 48].includes(ps)) MPState.pageSize = ps;

  await loadCategoriesIntoSelect();
}

export async function loadInitialUserData() {
  try {
    MPState.currentUser = await getCurrentUser();
  } catch {
    MPState.currentUser = null;
  }

  if (!MPState.currentUser) return;

  try {
    const myOffers = await getMyOffers();
    MPState.myOffersByItemId = {};

    for (const entry of myOffers) {
      const offer = entry.offer;
      if (offer?.item_id) MPState.myOffersByItemId[offer.item_id] = entry;
    }
  } catch {
    MPState.myOffersByItemId = {};
  }
}
