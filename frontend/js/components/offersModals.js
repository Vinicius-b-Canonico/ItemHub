// =============================================================
//  Reusable Offer Modals Component – ItemHub Edition
// =============================================================

import {
  getOffersForItem,
  createOffer,
  updateOffer
} from "../api/offersApi.js";
import { renderOfferCard } from "./offerCard.js";
import { getCurrentUser } from "../api/authApi.js";
import { getItem } from "../api/itemsApi.js";

let viewOffersModal = null;
let offerDetailsModal = null;
let modalsInjected = false;

function injectModalsIfNeeded() {
  if (modalsInjected) return;

  const container = document.getElementById("offersModalContainer");
  if (!container) {
    console.error("offersModalContainer não encontrado na página.");
    return;
  }

  container.innerHTML = `
    <!-- ========================================================= -->
    <!-- Ver Propostas Recebidas -->
    <!-- ========================================================= -->
    <div class="modal fade" id="viewOffersModal" tabindex="-1" aria-hidden="true">
      <div class="modal-dialog modal-lg modal-dialog-scrollable">
        <div class="modal-content shadow-lg">
          <div class="modal-header bg-primary text-white">
            <h5 class="modal-title fw-bold">
              <i class="bi bi-handshake me-2"></i>
              Propostas Recebidas
            </h5>
            <button type="button" class="btn-close btn-close-white" data-bs-dismiss="modal"></button>
          </div>

          <div class="modal-body">
            <div id="viewOffersLoading" class="text-center py-5">
              <div class="spinner-border text-primary" role="status"></div>
              <p class="mt-3 text-muted">Carregando propostas...</p>
            </div>

            <div id="viewOffersError" class="alert alert-danger d-none"></div>

            <div id="viewOffersList"></div>
          </div>

          <div class="modal-footer">
            <button type="button" class="btn btn-secondary" data-bs-dismiss="modal">
              Fechar
            </button>
          </div>
        </div>
      </div>
    </div>

    <!-- ========================================================= -->
    <!-- Fazer / Editar Proposta -->
    <!-- ========================================================= -->
    <div class="modal fade" id="offerDetailsModal" tabindex="-1" aria-hidden="true">
      <div class="modal-dialog modal-dialog-centered">
        <div class="modal-content shadow-lg">
          <div class="modal-header bg-primary text-white">
            <h5 id="offerDetailsTitle" class="modal-title fw-bold">
              <i class="bi bi-plus-circle me-2"></i>
              Fazer Proposta
            </h5>
            <button type="button" class="btn-close btn-close-white" data-bs-dismiss="modal"></button>
          </div>

          <div class="modal-body">
            <div id="offerDetailsAlert"></div>

            <form id="offerDetailsForm" class="needs-validation" novalidate>

              <!-- Mensagem -->
              <div class="mb-4">
                <label for="offerMessage" class="form-label fw-semibold">Mensagem</label>
                <textarea id="offerMessage" class="form-control" rows="4"
                          placeholder="Explique sua proposta, condições ou disponibilidade..." required></textarea>
              </div>

              <!-- Tipo de Proposta -->
              <div class="mb-4">
                <label class="form-label fw-semibold mb-3">Tipo de Proposta</label>

                <div id="offerOptionsGroup" class="space-y-3">

                  <div class="form-check form-check-inline border rounded-3 p-3 mb-2">
                    <input class="form-check-input" type="radio" name="offerTypeSelect"
                           id="offerTypePay" value="pay">
                    <label class="form-check-label fw-medium" for="offerTypePay">
                      Quero <strong class="text-danger">pagar</strong> para levar
                    </label>
                  </div>

                  <div class="form-check form-check-inline border rounded-3 p-3 mb-2">
                    <input class="form-check-input" type="radio" name="offerTypeSelect"
                           id="offerTypeFree" value="free">
                    <label class="form-check-label fw-medium" for="offerTypeFree">
                      Quero levar <strong class="text-success">de graça</strong>
                    </label>
                  </div>

                  <div class="form-check form-check-inline border rounded-3 p-3 mb-2">
                    <input class="form-check-input" type="radio" name="offerTypeSelect"
                           id="offerTypePaidToTake" value="paid_to_take">
                    <label class="form-check-label fw-medium" for="offerTypePaidToTake">
                      Quero ser <strong class="text-warning">pago</strong> para levar
                    </label>
                  </div>

                </div>
              </div>

              <!-- Valor (aparece apenas se necessário) -->
              <div class="mb-4 d-none" id="offerValueGroup">
                <label for="offerValue" class="form-label fw-semibold">Valor (R$)</label>
                <div class="input-group">
                  <span class="input-group-text">R$</span>
                  <input type="number" id="offerValue" class="form-control form-control-lg text-end"
                         min="0" step="0.01" placeholder="0,00">
                </div>
                <div class="form-text">
                  • Pagar: insira o valor que você oferece<br>
                  • Pago pra levar: insira quanto quer receber
                </div>
              </div>

            </form>
          </div>

          <div class="modal-footer">
            <button type="button" class="btn btn-outline-secondary" data-bs-dismiss="modal">
              Cancelar
            </button>
            <button type="button" id="offerDetailsSaveBtn" class="btn btn-primary btn-lg px-5">
              Enviar Proposta
            </button>
          </div>
        </div>
      </div>
    </div>
  `;

  modalsInjected = true;
}

export function initializeOfferModals() {
  injectModalsIfNeeded();

  viewOffersModal = new bootstrap.Modal(document.getElementById("viewOffersModal"));
  offerDetailsModal = new bootstrap.Modal(document.getElementById("offerDetailsModal"));
}

// =============================================================
//  Ver Propostas Recebidas
// =============================================================
export async function openViewOffersModal(itemId) {
  initializeOfferModals();

  const loading = document.getElementById("viewOffersLoading");
  const errorBox = document.getElementById("viewOffersError");
  const list = document.getElementById("viewOffersList");

  loading.classList.remove("d-none");
  errorBox.classList.add("d-none");
  list.innerHTML = "";

  viewOffersModal.show();

  try {
    const [item, offers] = await Promise.all([
      getItem(itemId),
      getOffersForItem(itemId)
    ]);

    const currentUser = await getCurrentUser();

    loading.classList.add("d-none");

    if (!offers?.length) {
      list.innerHTML = `
        <div class="text-center py-5 text-muted">
          <i class="bi bi-inbox fs-1 mb-3"></i>
          <p>Nenhuma proposta recebida ainda.</p>
        </div>`;
      return;
    }

    const cards = offers
      .map(o => renderOfferCard(o, item, currentUser))
      .join("");

    list.innerHTML = `
      <div class="row row-cols-1 row-cols-md-2 g-4">
        ${cards}
      </div>
    `;

  } catch (err) {
    loading.classList.add("d-none");
    errorBox.textContent = err.message || "Erro ao carregar propostas.";
    errorBox.classList.remove("d-none");
  }
}

// =============================================================
//  Fazer / Editar Proposta
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

  const item = await getItem(itemId);
  const allowedType = item.offer_type;
  console.log("allowed type is ", allowedType);
  // Reset visibility
  [optionPay, optionFree, optionPaidToTake].forEach(el => {
    el.parentElement.classList.remove("d-none");
  });

  const allowed = {
    pay: allowedType === "pay" || allowedType === "free" || allowedType === "paid_to_take",
    free: allowedType === "free" || allowedType === "paid_to_take",
    paid_to_take: allowedType === "paid_to_take"
  };
  console.log("allowed refined is ", allowed);

  if (!allowed.pay) optionPay.parentElement.classList.add("d-none");
  if (!allowed.free) optionFree.parentElement.classList.add("d-none");
  if (!allowed.paid_to_take) optionPaidToTake.parentElement.classList.add("d-none");

  const updateValueVisibility = () => {
    if (optionPay.checked || optionPaidToTake.checked) {
      valueGroup.classList.remove("d-none");
    } else {
      valueGroup.classList.add("d-none");
      valueInput.value = "";
    }
  };

  [optionPay, optionFree, optionPaidToTake].forEach(el => el.onchange = updateValueVisibility);

  const determineTypeFromPrice = (price) => {
    if (price > 0) return "pay";
    if (price < 0) return "paid_to_take";
    return "free";
  };

  if (existingOffer) {
    title.innerHTML = `<i class="bi bi-pencil me-2"></i> Editar Proposta`;
    messageInput.value = existingOffer.message || "";
    const type = determineTypeFromPrice(existingOffer.price);

    if (!allowed[type]) {
      alertBox.innerHTML = `<div class="alert alert-danger">Este tipo de proposta não é mais permitido neste anúncio.</div>`;
      return;
    }

    if (type === "pay") optionPay.checked = true;
    else if (type === "paid_to_take") optionPaidToTake.checked = true;
    else optionFree.checked = true;

    if (existingOffer.price !== 0) valueInput.value = Math.abs(existingOffer.price);
    updateValueVisibility();
  } else {
    title.innerHTML = `<i class="bi bi-plus-circle me-2"></i> Fazer Proposta`;
    messageInput.value = "";
    valueInput.value = "";

    if (allowed.pay) optionPay.checked = true;
    else if (allowed.free) optionFree.checked = true;
    else optionPaidToTake.checked = true;

    updateValueVisibility();
  }

  saveBtn.onclick = async () => {
    alertBox.innerHTML = "";

    const message = messageInput.value.trim();
    if (!message) {
      alertBox.innerHTML = `<div class="alert alert-warning">Por favor, escreva uma mensagem.</div>`;
      return;
    }

    let price = 0;
    if (optionPay.checked) price = Math.abs(Number(valueInput.value) || 0);
    else if (optionPaidToTake.checked) price = -Math.abs(Number(valueInput.value) || 0);

    try {
      if (existingOffer) {
        await updateOffer(existingOffer.id, price, message);
      } else {
        await createOffer(itemId, price, message);
      }

      alertBox.innerHTML = `<div class="alert alert-success">Proposta enviada com sucesso!</div>`;
      setTimeout(() => {
        offerDetailsModal.hide();
        location.reload();
      }, 1000);
    } catch (err) {
      alertBox.innerHTML = `<div class="alert alert-danger">${err.message || "Erro ao salvar proposta."}</div>`;
    }
  };

  offerDetailsModal.show();
}