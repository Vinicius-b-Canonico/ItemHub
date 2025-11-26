// js/pages/marketplace/render.js
import { listItems } from "../../api/itemsApi.js";
import { renderItemCard } from "../../components/itemCard.js";
import { MPState } from "./state.js";
import { renderPagination, renderSummary, updateUrl } from "./pagination.js";

export function resetAndLoadItems() {
  MPState.page = 1;
  MPState.totalPages = 1;
  MPState.totalItems = 0;

  updateUrl();
  renderSummary();

  MPState.itemsContainer.innerHTML = `
    <div class="text-center py-5 text-muted">Loading items...</div>
  `;
  loadItemsPage();
}

export async function loadItemsPage({ preserveScroll = false } = {}) {
  if (MPState.isLoading) return;

  MPState.isLoading = true;
  disablePagination(true);

  const { category, offer_type, search } = MPState.filterForm;

  try {
    const response = await listItems({
      category: category.value,
      page: MPState.page,
      page_size: MPState.pageSize,
    });

    const { items = [], total_pages = 1, total_items = 0 } = response;

    MPState.totalPages = total_pages;
    MPState.totalItems = total_items;

    // Graceful bounce back
    if (items.length === 0 && MPState.page > 1) {
      MPState.page = Math.max(1, MPState.page - 1);
      updateUrl();
      showAlert("No items on that page — returning to previous page.", "warning");
      MPState.isLoading = false;
      disablePagination(false);
      return loadItemsPage();
    }

    // First page resets layout
    if (MPState.page === 1) {
      MPState.itemsContainer.innerHTML = `
        <div class="row row-cols-1 row-cols-sm-2 row-cols-md-3 g-3"></div>
      `;
    }

    let row = MPState.itemsContainer.querySelector(".row");
    if (!row) {
      MPState.itemsContainer.innerHTML = `
        <div class="row row-cols-1 row-cols-sm-2 row-cols-md-3 g-3"></div>
      `;
      row = MPState.itemsContainer.querySelector(".row");
    }

    // Client filters
    let filtered = items;

    const type = offer_type.value;
    const searchTerm = search.value.trim().toLowerCase();

    if (type) filtered = filtered.filter(i => i.offer_type === type);
    if (searchTerm)
      filtered = filtered.filter(i =>
        i.title.toLowerCase().includes(searchTerm) ||
        (i.description && i.description.toLowerCase().includes(searchTerm))
      );

    if (filtered.length === 0 && MPState.page === 1) {
      MPState.itemsContainer.innerHTML = `
        <p class="text-center text-muted mt-5">No items found.</p>
      `;
      MPState.totalItems = 0;
      MPState.totalPages = 1;
      renderPagination();
      renderSummary();
      MPState.isLoading = false;
      disablePagination(false);
      return;
    }

    for (const item of filtered) {
      let userOfferId = null;

      if (MPState.currentUser) {
        const match = MPState.myOffersByItemId[item.id];
        if (match?.offer) userOfferId = match.offer.id;
      }

      row.insertAdjacentHTML(
        "beforeend",
        renderItemCard(item, MPState.currentUser, true, userOfferId)
      );
    }

    renderPagination();
    renderSummary();
    updateUrl();

    if (!preserveScroll) {
      const top = MPState.itemsContainer.getBoundingClientRect().top + scrollY - 80;
      scrollTo({ top, behavior: "smooth" });
    }

    MPState.page += 1;
  } catch (err) {
    showAlert(`❌ Failed to load items: ${err.message}`, "danger");
  }

  MPState.isLoading = false;
  disablePagination(false);
}

function disablePagination(disabled) {
  const buttons = MPState.paginationContainer?.querySelectorAll("button") || [];
  buttons.forEach(b => (b.disabled = !!disabled));
}

export function showAlert(message, type) {
  MPState.alertContainer.innerHTML = `
    <div class="alert alert-${type} alert-dismissible fade show">
      ${message}
      <button type="button" class="btn-close" data-bs-dismiss="alert"></button>
    </div>`;
}
