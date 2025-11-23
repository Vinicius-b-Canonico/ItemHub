import { loadNavbar } from "../components/navbar.js";
import { listItems, getItemCategories } from "../api/itemsApi.js";
import { getCurrentUser } from "../api/authApi.js";
import { renderItemCard } from "../components/itemCard.js";

// NEW: one-time fetch of all user offers
import { getMyOffers } from "../api/offersApi.js";

import {
  openOfferDetailsModal,
  openViewOffersModal,
} from "../components/offersModals.js";

document.addEventListener("DOMContentLoaded", async () => {
  await loadNavbar();

  const itemsContainer = document.querySelector("#itemsContainer");
  const alertContainer = document.querySelector("#alertContainer");
  const filterForm = document.querySelector("#filterForm");
  const clearBtn = document.querySelector("#clearFiltersBtn");

  // NEW UI elements
  const itemsSummary = document.querySelector("#itemsSummary");
  const paginationContainer = document.querySelector("#paginationContainer");

  let currentUser = null;

  // Pagination state
  let page = 1;
  let pageSize = 20;
  let totalPages = 1;
  let totalItems = 0;
  let isLoading = false;

  // NEW: store user offers in a quick lookup map
  let myOffersByItemId = {};

  // Read initial page + page_size from URL (if present)
  const urlParams = new URLSearchParams(window.location.search);
  const initialPage = parseInt(urlParams.get("page"), 10);
  const initialPageSize = parseInt(urlParams.get("page_size"), 10);
  if (!Number.isNaN(initialPage) && initialPage > 0) page = initialPage;
  if (!Number.isNaN(initialPageSize) && [12, 20, 48].includes(initialPageSize)) pageSize = initialPageSize;

  try {
    currentUser = await getCurrentUser();
  } catch {
    currentUser = null;
  }

  // NEW: one-time fetch of user offers
  if (currentUser) {
    try {
      const myOffers = await getMyOffers();
      myOffersByItemId = {};

      for (const entry of myOffers) {
        const offer = entry.offer;
        if (offer && offer.item_id) {
          myOffersByItemId[offer.item_id] = entry;
        }
      }
    } catch (err) {
      console.error("Failed to load user's offers:", err);
      myOffersByItemId = {};
    }
  }

  await loadCategories();
  // initial load (honors page/pageSize read from URL)
  resetAndLoadItems();

  /* ============================================================
     FILTER EVENTS
  ============================================================ */

  filterForm.addEventListener("submit", (e) => {
    e.preventDefault();
    resetAndLoadItems();
  });

  clearBtn.addEventListener("click", () => {
    filterForm.category.value = "";
    filterForm.offer_type.value = "";
    filterForm.search.value = "";
    resetAndLoadItems();
  });

  async function loadCategories() {
    const select = filterForm.category;

    try {
      const categories = await getItemCategories();
      select.innerHTML = `<option value="">All Categories</option>`;
      categories.forEach((cat) => {
        select.innerHTML += `<option value="${cat}">${cat}</option>`;
      });
    } catch (err) {
      console.error("Failed to load categories:", err);
      select.innerHTML = `<option value="">All Categories</option>`;
    }
  }

  /* ============================================================
     RESET + LOAD ITEMS
  ============================================================ */

  function resetAndLoadItems() {
    page = 1;
    totalPages = 1;
    totalItems = 0;
    updateUrl();
    renderSummary();
    itemsContainer.innerHTML = `
      <div class="text-center py-5 text-muted">Loading items...</div>
    `;
    loadItemsPage();
  }

  async function loadItemsPage({ preserveScroll = false } = {}) {
    if (isLoading) return;
    if (page > totalPages && totalPages !== 0) return;

    isLoading = true;
    setPaginationDisabled(true);

    const category = filterForm.category.value;
    const offerType = filterForm.offer_type.value;
    const searchTerm = filterForm.search.value.trim().toLowerCase();

    try {
      const response = await listItems({
        category,
        page,
        page_size: pageSize,
      });

      const { items = [], total_pages = 1, total_items = 0 } = response;
      totalPages = total_pages;
      totalItems = total_items;

      // If backend returned an empty page but we're beyond page 1, go back one page gracefully
      if (items.length === 0 && page > 1) {
        page = Math.max(1, page - 1);
        updateUrl();
        showAlert("No items on that page — returning to previous page.", "warning");
        isLoading = false;
        setPaginationDisabled(false);
        return loadItemsPage();
      }

      // First page = reset UI
      if (page === 1) {
        itemsContainer.innerHTML = `
          <div class="row row-cols-1 row-cols-sm-2 row-cols-md-3 g-3"></div>
        `;
      }

      let row = itemsContainer.querySelector(".row");
      if (!row) {
        itemsContainer.innerHTML = `
          <div class="row row-cols-1 row-cols-sm-2 row-cols-md-3 g-3"></div>
        `;
        row = itemsContainer.querySelector(".row");
      }

      // Apply client filters
      let filteredItems = items;

      if (offerType) {
        filteredItems = filteredItems.filter((i) => i.offer_type === offerType);
      }

      if (searchTerm) {
        filteredItems = filteredItems.filter(
          (i) =>
            i.title.toLowerCase().includes(searchTerm) ||
            (i.description && i.description.toLowerCase().includes(searchTerm))
        );
      }

      if (filteredItems.length === 0 && page === 1) {
        itemsContainer.innerHTML = `
          <p class="text-center text-muted mt-5">
            No items found matching your criteria.
          </p>`;
        totalItems = 0;
        totalPages = 1;
        renderPagination();
        renderSummary();
        isLoading = false;
        setPaginationDisabled(false);
        return;
      }

      // RENDER CARDS — using myOffersByItemId lookup
      for (const item of filteredItems) {
        let userOfferId = null;

        if (currentUser) {
          const match = myOffersByItemId[item.id];
          if (match && match.offer) {
            userOfferId = match.offer.id;
          }
        }

        row.insertAdjacentHTML(
          "beforeend",
          renderItemCard(item, currentUser, true, userOfferId)
        );
      }

      renderPagination();
      renderSummary();
      updateUrl();

      // After rendering, if desired, scroll to top of items
      if (!preserveScroll) {
        const topOfGrid = itemsContainer.getBoundingClientRect().top + window.scrollY - 80;
        window.scrollTo({ top: topOfGrid, behavior: "smooth" });
      }

      page += 1;
    } catch (err) {
      showAlert(`❌ Failed to load items: ${err.message}`, "danger");
    }

    isLoading = false;
    setPaginationDisabled(false);
  }

  /* ============================================================
     PAGINATION UI + HELPERS
  ============================================================ */

  function renderSummary() {
    if (!itemsSummary) return;
    if (totalItems === 0) {
      itemsSummary.innerHTML = "";
      return;
    }

    const start = Math.min((page - 1) * pageSize + 1, totalItems);
    // when we've incremented page after fetch, the last shown page is page-1
    const lastShownPage = Math.max(1, page - 1);
    const end = Math.min(lastShownPage * pageSize, totalItems);

    itemsSummary.innerHTML = `
      <div class="d-flex flex-column flex-sm-row justify-content-between align-items-start align-items-sm-center mb-2">
        <div class="small text-muted">
          Showing ${start}–${end} of ${totalItems} items
        </div>

        <div class="d-flex align-items-center mt-2 mt-sm-0">
          <div class="me-2 small text-muted">Items per page</div>
          <select id="pageSizeSelect" class="form-select form-select-sm" style="width:90px;">
            <option value="12"${pageSize===12 ? " selected": ""}>12</option>
            <option value="20"${pageSize===20 ? " selected": ""}>20</option>
            <option value="48"${pageSize===48 ? " selected": ""}>48</option>
          </select>
        </div>
      </div>
    `;

    const pageSizeSelect = document.querySelector("#pageSizeSelect");
    if (pageSizeSelect) {
      pageSizeSelect.addEventListener("change", () => {
        const newSize = parseInt(pageSizeSelect.value, 10);
        if ([12, 20, 48].includes(newSize) && newSize !== pageSize) {
          pageSize = newSize;
          page = 1;
          updateUrl();
          itemsContainer.innerHTML = `<div class="text-center py-5 text-muted">Loading items...</div>`;
          loadItemsPage();
        }
      });
    }
  }

  function renderPagination() {
    if (!paginationContainer) return;

    // If only 1 page, hide pagination
    if (totalPages <= 1) {
      paginationContainer.innerHTML = "";
      return;
    }

    const visible = buildVisiblePageList(Math.max(1, page - 1), totalPages);

    // Build pagination HTML
    let html = `
      <nav aria-label="Page navigation" class="mt-3">
        <ul class="pagination justify-content-center mb-0">
    `;

    // Prev button (go to previous page set)
    const prevDisabled = (page <= 1) ? " disabled" : "";
    html += `
      <li class="page-item${prevDisabled}">
        <button class="page-link" data-page="${Math.max(1, page - 1)}" aria-label="Previous">« Prev</button>
      </li>
    `;

    // Page buttons with ellipses
    for (const p of visible) {
      if (p === "...") {
        html += `<li class="page-item disabled"><span class="page-link">…</span></li>`;
      } else {
        const active = (p === (page)) ? ` active aria-current="page"` : "";
        html += `
          <li class="page-item${active}">
            <button class="page-link" data-page="${p}">${p}</button>
          </li>
        `;
      }
    }

    // Next button
    const nextDisabled = (page > totalPages) ? " disabled" : "";
    html += `
      <li class="page-item${nextDisabled}">
        <button class="page-link" data-page="${Math.min(totalPages, page)}" aria-label="Next">Next »</button>
      </li>
    `;

    html += `</ul></nav>`;

    paginationContainer.innerHTML = html;

    // Attach event handler (event delegation)
    paginationContainer.querySelector("ul.pagination").addEventListener("click", (ev) => {
      const btn = ev.target.closest("button[data-page]");
      if (!btn) return;
      const toPage = parseInt(btn.dataset.page, 10);
      if (Number.isNaN(toPage) || toPage < 1 || toPage > totalPages) return;

      // Set page and load it (preserve scroll only if same page)
      page = toPage;
      // We want to load the selected page's content — set itemsContainer to loading then loadItemsPage
      itemsContainer.innerHTML = `<div class="text-center py-5 text-muted">Loading items...</div>`;
      updateUrl();
      loadItemsPage();
    });
  }

  // Build visible page list with ellipses. This shows pages centered on current with first/last.
  function buildVisiblePageList(currentPage, total) {
    // currentPage is the page we show active (the actual visible page index), here we pass page-1 in caller
    // But to keep it simple, we'll base on the currently loaded "last shown page" which is page-1
    const cur = currentPage;
    const max = total;

    // Always show first and last, and window of +/-2 around current
    const pages = new Set();
    pages.add(1);
    pages.add(max);

    for (let p = cur - 2; p <= cur + 2; p++) {
      if (p >= 1 && p <= max) pages.add(p);
    }

    const sorted = Array.from(pages).sort((a, b) => a - b);
    const out = [];
    let last = 0;

    for (const p of sorted) {
      if (last && p - last > 1) out.push("...");
      out.push(p);
      last = p;
    }

    return out;
  }

  function setPaginationDisabled(disabled) {
    if (!paginationContainer) return;
    const buttons = paginationContainer.querySelectorAll("button");
    buttons.forEach((b) => (b.disabled = !!disabled));
  }

  function updateUrl() {
    const params = new URLSearchParams(window.location.search);
    if (filterForm.category.value) params.set("category", filterForm.category.value);
    else params.delete("category");

    if (filterForm.search.value) params.set("search", filterForm.search.value);
    else params.delete("search");

    if (filterForm.offer_type.value) params.set("offer_type", filterForm.offer_type.value);
    else params.delete("offer_type");

    params.set("page", page);
    params.set("page_size", pageSize);

    const newUrl = `${window.location.pathname}?${params.toString()}`;
    window.history.replaceState({}, "", newUrl);
  }

  /* ============================================================
     ITEM CARD EVENT DELEGATION
  ============================================================ */

  itemsContainer.addEventListener("click", async (e) => {
    const btn = e.target.closest("[data-action]");
    if (!btn) return;

    const { action, id, offerId } = btn.dataset;

    switch (action) {
      case "view":
        window.location.href = `itemDetails.html?mode=view&id=${id}`;
        break;

      case "view-offers":
        openViewOffersModal(id);
        break;

      case "make-offer":
        if (!currentUser) return alert("Please log in to make an offer.");
        openOfferDetailsModal(id, null);
        break;

      case "edit-offer":
        if (!currentUser) return alert("Please log in to edit your offer.");
        try {
          const existing = myOffersByItemId[id]?.offer || null;
          if (!existing) {
            alert("Offer not found.");
            return;
          }
          openOfferDetailsModal(id, existing);
        } catch (err) {
          console.error("Error loading user's offer:", err);
          alert("Failed to load your offer.");
        }
        break;
    }
  });

  function showAlert(message, type) {
    alertContainer.innerHTML = `
      <div class="alert alert-${type} alert-dismissible fade show" role="alert">
        ${message}
        <button type="button" class="btn-close" data-bs-dismiss="alert"></button>
      </div>`;
  }
});
