import { normalizeImageUrl, formatDateTimeForUi } from "../utils/misc.js";
import { apiCancelOffer } from "../api/offersApi.js";
import { openOfferDetailsModal } from "./offersModals.js";

/**
 * Renderiza um card de proposta com dois modos:
 * - "owner-view": dono do item vendo as propostas recebidas
 * - "offer-maker-view": quem fez a proposta vendo sua própria oferta
 */
export function renderOfferCard(offer, item, currentUser, mode = "owner-view") {
  const isOfferOwner = offer.user_id === currentUser.id;

  // Badge de status da proposta
  const statusBadge = offer.status
    ? `<span class="badge bg-${offer.status === "ativo" ? "success" : "secondary"} text-uppercase small">
         ${offer.status === "ativo" ? "Ativa" : "Cancelada"}
       </span>`
    : "";

  // Badge do tipo de proposta com cores do ItemHub
  const offerTypeBadge = (() => {
    if (offer.price > 0)
      return '<span class="badge badge-pay">À Venda</span>';
    if (offer.price < 0)
      return '<span class="badge badge-paid-to-take">Pago pra Levar</span>';
    return '<span class="badge badge-free">Grátis</span>';
  })();

  const formattedPrice = Math.abs(offer.price).toFixed(2);
  const priceText = offer.price > 0
    ? `R$ ${formattedPrice}`
    : offer.price < 0
    ? `R$ ${formattedPrice} (você é pago pra levar)`
    : "Grátis";

  // Botões apenas no modo "offer-maker-view"
  const buttonsHTML = mode === "offer-maker-view" ? `
    <div class="d-flex flex-wrap gap-2 justify-content-center mt-3">
      <button class="btn btn-outline-primary btn-sm" data-action="edit-offer" data-offer-id="${offer.id}">
        Editar Proposta
      </button>
      <button class="btn btn-outline-danger btn-sm" data-action="cancel-offer" data-offer-id="${offer.id}">
        Cancelar Proposta
      </button>
      <a href="itemDetails.html?mode=view&id=${item.id}" class="btn btn-outline-secondary btn-sm">
        Ver Anúncio
      </a>
    </div>
  ` : "";

  // -------------------------------
  // MODO: Dono do item (owner-view)
  // -------------------------------
  if (mode === "owner-view") {
    return `
      <div class="col">
        <div class="card h-100 shadow-sm hover-shadow offer-card border-0" data-offer-id="${offer.id}">
          <div class="card-header bg-light d-flex justify-content-between align-items-center py-3">
            <div class="d-flex align-items-center gap-3">
              <div class="bg-primary text-white rounded-circle d-flex align-items-center justify-content-center" style="width:48px;height:48px;">
                <i class="bi bi-person fs-4"></i>
              </div>
              <div>
                <strong class="d-block">${offer.user_name || "Anônimo"}</strong>
                <small class="text-muted">
                  ${formatDateTimeForUi(offer.created_at, false)}
                  <span class="text-muted ms-1">(${formatDateTimeForUi(offer.created_at, true)})</span>
                </small>
              </div>
            </div>
            ${statusBadge}
          </div>

          <div class="card-body pt-3">
            <h6 class="fw-bold text-primary mb-3">
              Proposta para: <span class="text-dark">${item.title}</span>
            </h6>

            <div class="d-flex align-items-center gap-3 mb-3">
              ${offerTypeBadge}
              <strong class="fs-5">${priceText}</strong>
            </div>

            ${offer.message ? `
              <div class="bg-light rounded-3 p-3 small text-muted border">
                ${offer.message.replace(/\n/g, "<br>")}
              </div>
            ` : `
              <p class="text-muted small fst-italic">Sem mensagem</p>
            `}
          </div>
        </div>
      </div>
    `;
  }

  // -------------------------------
  // MODO: Quem fez a proposta (offer-maker-view)
  // -------------------------------
  return `
    <div class="col">
      <div class="card h-100 shadow-sm hover-shadow offer-card border-0" data-offer-id="${offer.id}">
        <div class="card-header bg-light d-flex align-items-center gap-3 py-3">
          ${item.images?.[0]?.image_url || item.image_url
            ? `<img src="${normalizeImageUrl(item.images?.[0]?.image_url || item.image_url)}" 
                    class="rounded" style="width:50px;height:50px;object-fit:cover;">`
            : `<div class="bg-secondary bg-opacity-10 rounded d-flex align-items-center justify-content-center" style="width:50px;height:50px;">
                 <i class="bi bi-image text-muted"></i>
               </div>`
          }
          <div>
            <strong class="d-block">${item.title}</strong>
            <small class="text-muted">${item.location || "Localização não informada"}</small>
          </div>
          <div class="ms-auto">${statusBadge}</div>
        </div>

        <div class="card-body">
          <div class="d-flex align-items-center gap-3 mb-3">
            ${offerTypeBadge}
            <strong class="fs-5">${priceText}</strong>
          </div>

          ${offer.message ? `
            <div class="bg-light rounded-3 p-3 small text-muted border mb-3">
              ${offer.message.replace(/\n/g, "<br>")}
            </div>
          ` : `<p class="text-muted small fst-italic mb-3">Sem mensagem</p>`}

          <div class="small text-muted">
            <i class="bi bi-person-check me-1"></i>
            Dono: <strong>${item.owner_username || "Anônimo"}</strong>
          </div>
          <div class="small text-muted mt-1">
            <i class="bi bi-clock me-1"></i>
            Enviada em ${formatDateTimeForUi(offer.created_at, false)}
          </div>
        </div>

        <div class="card-footer bg-white border-0 text-center">
          ${buttonsHTML}
        </div>
      </div>
    </div>
  `;
}

/**
 * Ativa os eventos dos botões nos cards de proposta
 */
export function initOfferCardEvents(container) {
  container.addEventListener("click", async (e) => {
    const btn = e.target.closest("[data-action]");
    if (!btn) return;

    const action = btn.dataset.action;
    const card = btn.closest(".offer-card");

    if (action === "edit-offer") {
      const offerId = btn.dataset.offerId;
      const offer = card._offerData;
      if (offer) openOfferDetailsModal(offer.item_id || offer.itemId, offer);
    }

    if (action === "cancel-offer") {
      const offerId = btn.dataset.offerId;
      if (!confirm("Tem certeza que deseja cancelar esta proposta?")) return;

      try {
        await apiCancelOffer(offerId);
        card.closest(".col")?.remove();
      } catch (err) {
        alert("Erro ao cancelar proposta.");
      }
    }
  });
}