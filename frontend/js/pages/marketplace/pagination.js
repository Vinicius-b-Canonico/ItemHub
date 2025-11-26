// js/pages/marketplace/pagination.js
import { MPState } from "./state.js";
import { loadItemsPage } from "./render.js";

export function renderPagination() {
  const container = MPState.paginationContainer;
  if (!container) return;

  if (MPState.totalPages <= 1) {
    container.innerHTML = "";
    return;
  }

  const visible = buildVisiblePages(Math.max(1, MPState.page - 1), MPState.totalPages);

  let html = `
    <nav><ul class="pagination justify-content-center mb-0">
      <li class="page-item${MPState.page <= 1 ? " disabled" : ""}">
        <button class="page-link" data-page="${Math.max(1, MPState.page - 1)}">« Prev</button>
      </li>
  `;

  for (const p of visible) {
    if (p === "...") {
      html += `<li class="page-item disabled"><span class="page-link">…</span></li>`;
    } else {
      const active = p === MPState.page ? " active" : "";
      html += `
        <li class="page-item${active}">
          <button class="page-link" data-page="${p}">${p}</button>
        </li>`;
    }
  }

  html += `
      <li class="page-item${MPState.page > MPState.totalPages ? " disabled" : ""}">
        <button class="page-link" data-page="${Math.min(MPState.totalPages, MPState.page)}">Next »</button>
      </li>
    </ul></nav>`;

  container.innerHTML = html;

  container.querySelector("ul.pagination").addEventListener("click", ev => {
    const btn = ev.target.closest("button[data-page]");
    if (!btn) return;

    const target = parseInt(btn.dataset.page, 10);
    if (!target || target < 1 || target > MPState.totalPages) return;

    MPState.page = target;
    MPState.itemsContainer.innerHTML = `<div class="text-center py-5 text-muted">Loading items...</div>`;
    loadItemsPage();
  });
}

function buildVisiblePages(cur, total) {
  const pages = new Set([1, total]);
  for (let p = cur - 2; p <= cur + 2; p++) {
    if (p >= 1 && p <= total) pages.add(p);
  }

  const sorted = [...pages].sort((a, b) => a - b);
  const out = [];
  let last = 0;

  for (const p of sorted) {
    if (last && p - last > 1) out.push("...");
    out.push(p);
    last = p;
  }
  return out;
}

export function renderSummary() {
  const el = MPState.itemsSummary;
  if (!el) return;

  if (MPState.totalItems === 0) {
    el.innerHTML = "";
    return;
  }

  const start = Math.min((MPState.page - 1) * MPState.pageSize + 1, MPState.totalItems);
  const lastPageShown = Math.max(1, MPState.page - 1);
  const end = Math.min(lastPageShown * MPState.pageSize, MPState.totalItems);

  el.innerHTML = `
    <div class="d-flex flex-column flex-sm-row justify-content-between mb-2">
      <div class="small text-muted">Showing ${start}–${end} of ${MPState.totalItems} items</div>

      <div class="d-flex align-items-center mt-2 mt-sm-0">
        <div class="me-2 small text-muted">Items per page</div>
        <select id="pageSizeSelect" class="form-select form-select-sm" style="width:90px;">
          <option value="12"${MPState.pageSize===12?" selected":""}>12</option>
          <option value="20"${MPState.pageSize===20?" selected":""}>20</option>
          <option value="48"${MPState.pageSize===48?" selected":""}>48</option>
        </select>
      </div>
    </div>`;

  document.querySelector("#pageSizeSelect").addEventListener("change", e => {
    const newSize = parseInt(e.target.value, 10);
    if ([12, 20, 48].includes(newSize)) {
      MPState.pageSize = newSize;
      MPState.page = 1;
      updateUrl();
      MPState.itemsContainer.innerHTML = `<div class="text-center py-5 text-muted">Loading...</div>`;
      loadItemsPage();
    }
  });
}

export function updateUrl() {
  const { filterForm } = MPState;
  const params = new URLSearchParams(window.location.search);

  filterForm.category.value
    ? params.set("category", filterForm.category.value)
    : params.delete("category");

  filterForm.search.value
    ? params.set("search", filterForm.search.value)
    : params.delete("search");

  filterForm.offer_type.value
    ? params.set("offer_type", filterForm.offer_type.value)
    : params.delete("offer_type");

  params.set("page", MPState.page);
  params.set("page_size", MPState.pageSize);

  const newUrl = `${window.location.pathname}?${params.toString()}`;
  history.replaceState({}, "", newUrl);
}
