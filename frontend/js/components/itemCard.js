import { normalizeImageUrl } from "../utils/misc.js";

/**
 * Renders a reusable Bootstrap item card with optional compact mode.
 *
 * @param {Object} item - The item object from backend.
 * @param {Object|null} currentUser - The logged-in user (or null).
 * @param {boolean} [compact=false] - Compact mode hides nothing now; layout only.
 * @param {number} [existingOfferId=0] - If user already made an offer for this item.
 * @returns {string} HTML for the card
 */
export function renderItemCard(item, currentUser, compact = false, existingOfferId = 0) {
  const isOwner = currentUser && item.owner_id === currentUser.id;
  const hasOffer = !isOwner && existingOfferId && existingOfferId > 0;

  // -------------------------------
  // CARD VISUAL STYLE
  // -------------------------------
  // Owner   → blue border
  // Offer   → yellow border
  // Default → normal card
  let cardClass = "";
  if (isOwner) cardClass = "border-primary border-2";
  else if (hasOffer) cardClass = "border-warning border-2";

  // --- Image ---
  const imageHTML = item.image_url
    ? `<img src="${normalizeImageUrl(item.image_url)}" class="img-fluid rounded-start" alt="${item.title}">`
    : `<div class="bg-secondary text-white d-flex align-items-center justify-content-center"
         style="height:100%; min-height:${compact ? "90px" : "150px"};">
         No Image
       </div>`;

  // --- Status badge (optional) ---
  const statusBadge = item.status
    ? `<span class="badge bg-${item.status === "ativo" ? "success" : "secondary"}">${item.status}</span>`
    : "";

  // -------------------------------
  // BUTTONS (ALWAYS VISIBLE NOW)
  // -------------------------------
  const buttons = [];

  // Always available
  buttons.push(
    `<button class="btn btn-sm btn-outline-secondary me-1"
        data-action="view" data-id="${item.id}">
        View Details
     </button>`
  );

  if (isOwner) {
    // Owner tools
    buttons.push(
      `<button class="btn btn-sm btn-outline-primary me-1"
          data-action="edit" data-id="${item.id}">
          Edit
       </button>`
    );
    buttons.push(
      `<button class="btn btn-sm btn-outline-danger me-1"
          data-action="delete" data-id="${item.id}">
          Delete
       </button>`
    );
    buttons.push(
      `<button class="btn btn-sm btn-outline-success"
          data-action="view-offers" data-id="${item.id}">
          View Offers
       </button>`
    );
  } else {
    // Non-owner offer interactions
    if (hasOffer) {
      buttons.push(
        `<button class="btn btn-sm btn-outline-warning"
            data-action="edit-offer"
            data-offer-id="${existingOfferId}"
            data-id="${item.id}">
            View / Edit Offer
         </button>`
      );
    } else {
      buttons.push(
        `<button class="btn btn-sm btn-outline-success"
            data-action="make-offer" data-id="${item.id}">
            Make Offer
         </button>`
      );
    }
  }

  const buttonsHTML = `
    <div class="card-footer bg-transparent border-top-0 pb-2 text-center card-actions">
      ${buttons.join("")}
    </div>`;

  // -------------------------------
  // FINAL CARD HTML
  // -------------------------------
  return `
    <div class="col">
      <div class="card shadow-sm item-card h-100 ${compact ? "p-1" : ""} ${cardClass}"
           data-item-id="${item.id}">

        <div class="row g-0 h-100">
          <div class="col-4">${imageHTML}</div>

          <div class="col-8 d-flex flex-column justify-content-between">
            <div class="card-body pb-2 ${compact ? "py-1" : ""}">
              
              <h6 class="card-title mb-1 ${compact ? "small" : ""}">
                ${item.title}
              </h6>

              <div class="d-flex justify-content-between align-items-center mb-1">
                <small class="text-muted ${compact ? "small" : ""}">
                  ${item.category || "Uncategorized"}
                </small>
                ${statusBadge}
              </div>

              <p class="text-muted mb-1 ${compact ? "small" : ""}">
                ${item.location || "No location"}
              </p>

              <p class="mb-1 ${compact ? "small" : ""}">
                ${item.description || "<em>No description</em>"}
              </p>
            </div>

            ${buttonsHTML}
          </div>
        </div>
      </div>
    </div>
  `;
}
