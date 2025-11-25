import { normalizeImageUrl } from "../utils/misc.js";

export function renderItemCard(item, currentUser, compact = false, existingOfferId = 0) {
  const isOwner = currentUser && item.owner_id === currentUser.id;
  const hasOffer = !isOwner && existingOfferId && existingOfferId > 0;

  // Border visual feedback
  let borderClass = "";
  if (isOwner) borderClass = "border-primary border-3";
  else if (hasOffer) borderClass = "border-warning border-3";

  // Image
  const imageHTML = item.images?.[0]?.image_url || item.image_url
    ? `<img src="${normalizeImageUrl(item.images?.[0]?.image_url || item.image_url)}" 
            class="card-img-top" style="height:220px; object-fit:cover;" alt="${item.title}">`
    : `<div class="bg-light d-flex align-items-center justify-content-center" style="height:220px;">
         <i class="bi bi-image fs-1 text-muted"></i>
       </div>`;

  // Offer type badge (Grátis / Venda / Pago pra levar)
  const offerBadge = (() => {
    switch (item.offer_type) {
      case "free":         return '<span class="badge badge-free">Grátis</span>';
      case "pay":          return '<span class="badge badge-pay">À Venda</span>';
      case "paid_to_take": return '<span class="badge badge-paid-to-take">Pago pra Levar</span>';
      default:             return '<span class="badge bg-secondary">Indefinido</span>';
    }
  })();

  // Action buttons
  const buttons = [];

  if (isOwner) {
    buttons.push(`
      <button class="btn btn-sm btn-outline-primary" data-action="edit" data-id="${item.id}">
        Editar
      </button>
      <button class="btn btn-sm btn-outline-danger" data-action="delete" data-id="${item.id}">
        Excluir
      </button>
      <button class="btn btn-sm btn-success" data-action="view-offers" data-id="${item.id}">
        Ver Propostas
      </button>
    `);
  } else {
    if (hasOffer) {
      buttons.push(`
        <button class="btn btn-warning text-dark fw-bold" data-action="edit-offer" data-offer-id="${existingOfferId}" data-id="${item.id}">
          Ver / Editar Proposta
        </button>
      `);
    } else {
      buttons.push(`
        <button class="btn btn-success" data-action="make-offer" data-id="${item.id}">
          Fazer Proposta
        </button>
      `);
    }
  }

  buttons.unshift(`
    <a href="itemDetails.html?mode=view&id=${item.id}" class="btn btn-sm btn-outline-secondary">
      Ver Detalhes
    </a>
  `);

  return `
    <div class="col">
      <div class="card h-100 shadow-sm hover-shadow item-card ${borderClass}" data-item-id="${item.id}">
        ${imageHTML}
        <div class="card-body d-flex flex-column">
          <div class="d-flex justify-content-between align-items-start mb-2">
            <h5 class="card-title mb-0">${item.title}</h5>
            ${offerBadge}
          </div>
          <p class="text-muted small mb-2">
            ${item.location || "Localização não informada"}
          </p>
          <p class="card-text flex-grow-1 text-muted small">
            ${item.description?.substring(0, 100) || "Sem descrição"}...
          </p>
          <div class="mt-auto pt-3 border-top">
            <div class="d-flex flex-wrap gap-2 justify-content-center">
              ${buttons.join("")}
            </div>
          </div>
        </div>
      </div>
    </div>
  `;
}