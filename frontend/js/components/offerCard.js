import { normalizeImageUrl, formatDateTimeForUi } from "../utils/misc.js";
import { apiCancelOffer } from "../api/offersApi.js";
import { openOfferDetailsModal } from "./offersModals.js";

/**
 * Renders a unified Offer Card with dual modes.
 * After injecting the HTML into the DOM, call:
 *    initOfferCardEvents(parentElement);
 */
export function renderOfferCard(offer, item, currentUser, mode = "owner-view") {
  const isOfferOwner = offer.user_id === currentUser.id;

  const statusBadge = offer.status
    ? `<span class="badge bg-${
        offer.status === "ativo" ? "success" : "secondary"
      }">${offer.status}</span>`
    : "";

  // -------------------------
  // BUTTONS (offer-maker)
  // -------------------------
  const buttons = [];

  if (mode === "offer-maker-view") {
    // EDIT
    buttons.push(`
      <button class="btn btn-sm btn-outline-primary me-1"
              data-action="edit-offer"
              data-offer-id="${offer.id}">
        ✏️ Edit
      </button>
    `);

    // CANCEL
    buttons.push(`
      <button class="btn btn-sm btn-outline-danger me-1"
              data-action="cancel-offer"
              data-offer-id="${offer.id}">
        ❌ Cancel
      </button>
    `);

    // VIEW ITEM
    buttons.push(`
      <button class="btn btn-sm btn-outline-secondary"
              data-action="view-item"
              data-item-id="${item.id}">
        🔍 View Item
      </button>
    `);
  }

  // ============================================================
  // MODE-SPECIFIC SECTIONS
  // ============================================================

  let headerHTML = "";
  let bodyHTML = "";

  // ---------- OWNER VIEW ----------
  if (mode === "owner-view") {
    headerHTML = `
      <div class="card-header bg-light py-2 d-flex justify-content-between align-items-center">
        <div class="d-flex align-items-center">
          <div class="rounded-circle bg-secondary bg-opacity-25 p-2 me-2">
            <i class="bi bi-person"></i>
          </div>
          <div>
            <strong>${offer.user_name}</strong><br>
            <small class="text-muted">
              ${formatDateTimeForUi(offer.created_at, false)}
              <span class="ms-1">
                (${formatDateTimeForUi(offer.created_at, true)})
              </span>
            </small>
          </div>
        </div>
        ${statusBadge}
      </div>
    `;

    bodyHTML = `
      <div class="card-body">

        <h6 class="fw-semibold mb-2 text-primary">
          Offer for: ${item.title}
        </h6>

        <div class="mb-3">
          <span class="badge bg-primary p-2">
            💰 R$ ${offer.price.toFixed(2)}
          </span>
        </div>

        <div class="p-2 rounded border bg-light small text-muted mb-3">
          ${offer.message ? offer.message : "<em>No message</em>"}
        </div>

      </div>
    `;
  }

  // ---------- OFFER MAKER VIEW ----------
  else if (mode === "offer-maker-view") {
    headerHTML = `
      <div class="card-header bg-light py-2 d-flex justify-content-between align-items-center">

        <div class="d-flex align-items-center">
          <img src="${normalizeImageUrl(item.image_url)}" 
               class="rounded me-2" 
               style="width:40px;height:40px;object-fit:cover;">
          <div>
            <strong>${item.title}</strong><br>
            <small class="text-muted">${item.category || ""}</small>
          </div>
        </div>

        ${statusBadge}
      </div>
    `;

    bodyHTML = `
      <div class="card-body">

        <div class="mb-2 text-muted small">
          <i class="bi bi-geo-alt"></i> ${item.location || "No location"}
        </div>

        <div class="mb-3">
          <span class="badge bg-primary p-2">
            💰 Your offer: R$ ${offer.price.toFixed(2)}
          </span>
        </div>

        <div class="p-2 rounded border bg-light small text-muted mb-3">
          ${offer.message ? offer.message : "<em>No message</em>"}
        </div>

        <div class="small text-muted">
          <i class="bi bi-person-check"></i>
          Item Owner: <strong>${item.owner_username}</strong>
        </div>

        <div class="small text-muted mt-1">
          <i class="bi bi-clock"></i>
          Offered  
          ${formatDateTimeForUi(offer.created_at, false)}
          <span class="ms-1">(${formatDateTimeForUi(offer.created_at, true)})</span>
        </div>

      </div>
    `;
  }

  // ============================================================
  // FINAL CARD HTML
  // ============================================================
  return `
    <div class="col">
      <div class="card shadow-sm offer-card h-100 border-0" data-offer-id="${offer.id}">
        ${headerHTML}
        ${bodyHTML}
        <div class="card-footer bg-white text-center pb-3">
          ${buttons.join("")}
        </div>
      </div>
    </div>
  `;
}

/**
 * Attach behaviors to all OfferCards inside a container.
 * Call this AFTER inserting cards into the DOM.
 */
export function initOfferCardEvents(container) {
  if (!container) return;

  container.addEventListener("click", async (ev) => {
    const btn = ev.target.closest("[data-action]");
    if (!btn) return;

    const action = btn.dataset.action;

    // EDIT -----------------------------------------------------
    if (action === "edit-offer") {
      const offerId = btn.dataset.offerId;
      const card = btn.closest(".offer-card");
      const offer = card._offerData; // set by parent page
      openOfferDetailsModal(offerId, offer);
    }

    // CANCEL ---------------------------------------------------
    if (action === "cancel-offer") {
      const offerId = btn.dataset.offerId;

      if (!confirm("Cancel this offer?")) return;

      const ok = await apiCancelOffer(offerId);
      if (ok) {
        btn.closest(".offer-card").remove();
      }
    }

    // VIEW ITEM ------------------------------------------------
    if (action === "view-item") {
      const itemId = btn.dataset.itemId;
      window.location.href = `itemDetails.html?mode=view&id=${itemId}`;
    }
  });
}
