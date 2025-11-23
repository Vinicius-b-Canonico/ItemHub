// =============================================================
//  Reusable Offer Modals Component
// =============================================================

import {
  getOffersForItem,
  createOffer,
  updateOffer
} from "../api/offersApi.js";
import { renderOfferCard } from "./offerCard.js";
import { getCurrentUser } from "../api/authApi.js"; // ← or your equivalent
import { getItem } from "../api/itemsApi.js"; // ← you must have this

let viewOffersModal = null;
let offerDetailsModal = null;
let modalsInjected = false;

// Inject modal HTML into the page once
function injectModalsIfNeeded() {
  if (modalsInjected) return;

  const container = document.getElementById("offersModalContainer");
  if (!container) {
    console.error("offersModalContainer missing in this page.");
    return;
  }

  container.innerHTML = `
    <!-- ========================================================= -->
    <!-- 🔹 VIEW OFFERS MODAL -->
    <!-- ========================================================= -->
    <div class="modal fade" id="viewOffersModal" tabindex="-1">
      <div class="modal-dialog modal-lg modal-dialog-scrollable">
        <div class="modal-content">
          <div class="modal-header">
            <h5 class="modal-title">Offers for This Item</h5>
            <button type="button" class="btn-close" data-bs-dismiss="modal"></button>
          </div>

          <div class="modal-body">

            <!-- Loading Spinner -->
            <div id="viewOffersLoading" class="text-center my-3 d-none">
              <div class="spinner-border"></div>
              <p class="text-muted mt-2">Loading offers...</p>
            </div>

            <!-- Error -->
            <div id="viewOffersError" class="alert alert-danger d-none"></div>

            <!-- Offer list -->
            <ul id="viewOffersList" class="list-group"></ul>

          </div>

          <div class="modal-footer">
            <button type="button" class="btn btn-secondary"
                    data-bs-dismiss="modal">Close</button>
          </div>
        </div>
      </div>
    </div>

    <!-- ========================================================= -->
    <!-- 🔹 OFFER DETAILS MODAL (Make / Edit Offer) -->
    <!-- ========================================================= -->
    <div class="modal fade" id="offerDetailsModal" tabindex="-1">
      <div class="modal-dialog">
        <div class="modal-content">

          <div class="modal-header">
            <h5 id="offerDetailsTitle" class="modal-title">Make an Offer</h5>
            <button type="button" class="btn-close" data-bs-dismiss="modal"></button>
          </div>

          <div class="modal-body">
            <div id="offerDetailsAlert"></div>

            <form id="offerDetailsForm">

              <!-- MESSAGE -->
              <div class="mb-3">
                <label class="form-label fw-semibold">Message</label>
                <textarea id="offerMessage" class="form-control" rows="3"
                          placeholder="Explain your offer or terms"></textarea>
              </div>

              <!-- TYPE OPTIONS -->
              <div class="mb-3">
                <label class="form-label fw-semibold">Offer Type</label>

                <div id="offerOptionsGroup">

                  <div class="form-check">
                    <input class="form-check-input" type="radio"
                          name="offerTypeSelect" id="offerTypePay" value="pay">
                    <label class="form-check-label" for="offerTypePay">
                      I want to <strong>pay</strong> to take the item
                    </label>
                  </div>

                  <div class="form-check">
                    <input class="form-check-input" type="radio"
                          name="offerTypeSelect" id="offerTypeFree" value="free">
                    <label class="form-check-label" for="offerTypeFree">
                      I want to take it <strong>for free</strong>
                    </label>
                  </div>

                  <div class="form-check">
                    <input class="form-check-input" type="radio"
                          name="offerTypeSelect" id="offerTypePaidToTake" value="paid_to_take">
                    <label class="form-check-label" for="offerTypePaidToTake">
                      I want to be <strong>paid</strong> to take the item
                    </label>
                  </div>

                </div>
              </div>

              <!-- VALUE (shows only for pay or paid_to_take) -->
              <div class="mb-3 d-none" id="offerValueGroup">
                <label class="form-label fw-semibold">
                  Amount
                </label>
                <input type="number" id="offerValue"
                      class="form-control"
                      placeholder="Enter the amount">
              </div>

            </form>
          </div>

          <div class="modal-footer">
            <button type="button" class="btn btn-secondary"
                    data-bs-dismiss="modal">Cancel</button>

            <button type="button" id="offerDetailsSaveBtn"
                    class="btn btn-primary">Save Offer</button>
          </div>

        </div>
      </div>
    </div>

  `;

  modalsInjected = true;
}

// Called by pages to prepare modals
export function initializeOfferModals() {
  injectModalsIfNeeded();

  viewOffersModal = bootstrap.Modal.getOrCreateInstance(
    document.getElementById("viewOffersModal")
  );

  offerDetailsModal = bootstrap.Modal.getOrCreateInstance(
    document.getElementById("offerDetailsModal")
  );
}

// =============================================================
//  VIEW OFFERS MODAL
// =============================================================
export async function openViewOffersModal(itemId) {
  initializeOfferModals();

  const loading = document.getElementById("viewOffersLoading");
  const errorBox = document.getElementById("viewOffersError");
  const list = document.getElementById("viewOffersList");

  loading.classList.remove("d-none");
  errorBox.classList.add("d-none");
  list.innerHTML = "";   // will be replaced with a card grid

  viewOffersModal.show();

  try {
    // ----------------------------------------------------
    // Fetch data needed by the offerCard component
    // ----------------------------------------------------
    const [item, offers] = await Promise.all([
      getItem(itemId),
      getOffersForItem(itemId)
    ]);

    const currentUser = getCurrentUser();

    loading.classList.add("d-none");

    if (!offers.length) {
      list.innerHTML =
        `<div class="text-center text-muted py-3">No offers yet.</div>`;
      return;
    }

    // ----------------------------------------------------
    // Render cards inside a Bootstrap grid
    // ----------------------------------------------------
    const cards = offers
      .map(o => renderOfferCard(o, item, currentUser))
      .join("");

    list.innerHTML = `
      <div class="row row-cols-1 row-cols-md-2 g-3">
        ${cards}
      </div>
    `;

  } catch (err) {
    loading.classList.add("d-none");
    errorBox.textContent = err.message || "Failed to load offers.";
    errorBox.classList.remove("d-none");
  }
}



// =============================================================
//  OFFER DETAILS MODAL (Make / Edit Offer)
// =============================================================
export async function openOfferDetailsModal(itemId, existingOffer = null) {
  initializeOfferModals();

  const title = document.getElementById("offerDetailsTitle");
  const messageInput = document.getElementById("offerMessage");
  const valueInput = document.getElementById("offerValue");
  const valueGroup = document.getElementById("offerValueGroup");
  const saveBtn = document.getElementById("offerDetailsSaveBtn");
  const alertBox = document.getElementById("offerDetailsAlert");

  const optionPay = document.getElementById("offerTypePay");
  const optionFree = document.getElementById("offerTypeFree");
  const optionPaidToTake = document.getElementById("offerTypePaidToTake");

  alertBox.innerHTML = "";

  // ------------------------------------------------------------
  //  Fetch item to determine allowed options
  // ------------------------------------------------------------
  const item = await getItem(itemId);
  const allowedType = item.offer_type; // pay | free | paid_to_take

  // Reset all visibility
  optionPay.parentElement.classList.remove("d-none");
  optionFree.parentElement.classList.remove("d-none");
  optionPaidToTake.parentElement.classList.remove("d-none");

  // Helper: which UI options are allowed based on item rules
  const allowedOptions = {
    pay: false,
    free: false,
    paid_to_take: false
  };

  if (allowedType === "pay") {
    allowedOptions.pay = true;
  } else if (allowedType === "free") {
    allowedOptions.free = true;
    allowedOptions.pay = true;
  } else { // paid_to_take
    allowedOptions.pay = true;
    allowedOptions.free = true;
    allowedOptions.paid_to_take = true;
  }

  // UI updates for showing or hiding options
  if (!allowedOptions.pay) optionPay.parentElement.classList.add("d-none");
  if (!allowedOptions.free) optionFree.parentElement.classList.add("d-none");
  if (!allowedOptions.paid_to_take)
    optionPaidToTake.parentElement.classList.add("d-none");

  // ------------------------------------------------------------
  // Determine offer type from numeric price
  // ------------------------------------------------------------
  const determineTypeFromPrice = (value) => {
    if (value > 0) return "pay";
    if (value < 0) return "paid_to_take";
    return "free";
  };

  // ------------------------------------------------------------
  // UI — Show/hide value box
  // ------------------------------------------------------------
  function updateValueVisibility() {
    if (optionPay.checked || optionPaidToTake.checked) {
      valueGroup.classList.remove("d-none");
    } else {
      valueGroup.classList.add("d-none");
      valueInput.value = "";
    }
  }

  optionPay.onchange = updateValueVisibility;
  optionFree.onchange = updateValueVisibility;
  optionPaidToTake.onchange = updateValueVisibility;

  // ============================================================
  //  EDIT EXISTING OFFER
  // ============================================================
  if (existingOffer) {
    title.textContent = "Edit Your Offer";

    messageInput.value = existingOffer.message || "";
    const price = existingOffer.price;
    const offerType = determineTypeFromPrice(price);

    // 1. Validate that this offer's type is allowed by the item
    if (!allowedOptions[offerType]) {
      alertBox.innerHTML = `
        <div class="alert alert-danger">
          This offer type is no longer allowed for this item.
        </div>`;
      return; // stop and do not open modal
    }

    // 2. Select the correct radio option
    if (offerType === "pay") optionPay.checked = true;
    else if (offerType === "paid_to_take") optionPaidToTake.checked = true;
    else optionFree.checked = true;

    // 3. Prefill numeric value
    if (price !== 0) valueInput.value = Math.abs(price);

    updateValueVisibility();
  }

  // ============================================================
  //  NEW OFFER
  // ============================================================
  else {
    title.textContent = "Make an Offer";
    messageInput.value = "";
    valueInput.value = "";

    // Auto-select correct default based on restrictions
    if (allowedOptions.pay) optionPay.checked = true;
    else if (allowedOptions.free) optionFree.checked = true;
    else optionPaidToTake.checked = true;

    updateValueVisibility();
  }

  // ------------------------------------------------------------
  // SAVE HANDLER
  // ------------------------------------------------------------
  saveBtn.onclick = async () => {
    alertBox.innerHTML = "";

    const message = messageInput.value.trim();

    let finalValue = 0;
    if (optionPay.checked) {
      finalValue = Math.abs(Number(valueInput.value || 0));
    } else if (optionFree.checked) {
      finalValue = 0;
    } else if (optionPaidToTake.checked) {
      finalValue = -Math.abs(Number(valueInput.value || 0));
    }

    try {
      if (existingOffer) {
        await updateOffer(existingOffer.id, finalValue, message);
      } else {
        await createOffer(itemId, finalValue, message);
      }

      alertBox.innerHTML =
        `<div class="alert alert-success">Offer saved!</div>`;

      setTimeout(() => {
        offerDetailsModal.hide();
        location.reload();   // ← auto-reload after closing
      }, 900);


    } catch (err) {
      alertBox.innerHTML =
        `<div class="alert alert-danger">${err.message || "Error saving offer."}</div>`;
    }
  };

  offerDetailsModal.show();
}


