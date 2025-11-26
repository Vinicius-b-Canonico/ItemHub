// js/pages/marketplace/filters.js
import { getItemCategories } from "../../api/itemsApi.js";
import { MPState } from "./state.js";
import { resetAndLoadItems } from "./render.js";

export function initFilters() {
  const form = MPState.filterForm;
  form.addEventListener("submit", e => {
    e.preventDefault();
    resetAndLoadItems();
  });

  MPState.clearBtn.addEventListener("click", () => {
    form.category.value = "";
    form.offer_type.value = "";
    form.search.value = "";
    resetAndLoadItems();
  });
}

export async function loadCategoriesIntoSelect() {
  const select = MPState.filterForm.category;

  try {
    const cats = await getItemCategories();
    select.innerHTML = `<option value="">All Categories</option>`;
    cats.forEach(c => {
      select.innerHTML += `<option value="${c}">${c}</option>`;
    });
  } catch {
    select.innerHTML = `<option value="">All Categories</option>`;
  }
}
