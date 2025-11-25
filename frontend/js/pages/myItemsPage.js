import { renderItemCard } from "../components/itemCard.js";
import { getCurrentUser } from "../api/authApi.js";
import { getOffersForItem } from "../api/offersApi.js";
import { deleteItem, listItems } from "../api/itemsApi.js";
import { loadNavbar } from "../components/navbar.js";
import { openViewOffersModal, openOfferDetailsModal } from "../components/offersModals.js";

const itemsContainer = document.getElementById("itemsContainer");

document.addEventListener("DOMContentLoaded", async () => {
  await loadNavbar();

  const user = await getCurrentUser().catch(() => null);
  if (!user) {
    itemsContainer.innerHTML = `
      <div class="text-center py-5">
        <div class="bg-light rounded-4 p-5 shadow-sm" style="max-width:500px;margin:0 auto;">
          <i class="bi bi-shield-lock fs-1 text-muted mb-4"></i>
          <h3>Você não está conectado</h3>
          <p class="text-muted">Faça login para ver seus anúncios.</p>
          <a href="login.html" class="btn btn-primary">Entrar</a>
        </div>
      </div>
    `;
    return;
  }

  await loadUserItems(user);
});

async function loadUserItems(currentUser) {
  try {
    const { items } = await listItems({
      owner_id: currentUser.id,
      status: "ativo",
      page: 1,
      page_size: 9999
    });

    if (!items?.length) {
      itemsContainer.innerHTML = `
        <div class="text-center py-5">
          <i class="bi bi-inbox fs-1 text-muted mb-4"></i>
          <h4>Você ainda não anunciou nada</h4>
          <p class="text-muted">Que tal desapegar de algo hoje?</p>
          <a href="itemDetails.html?mode=create" class="btn btn-primary btn-lg">
            + Anunciar Meu Primeiro Item
          </a>
        </div>
      `;
      return;
    }

    itemsContainer.innerHTML = `
      <div class="row row-cols-1 row-cols-md-2 row-cols-lg-3 g-4">
        ${items.map(item => renderItemCard(item, currentUser, false)).join("")}
      </div>
    `;

  } catch (err) {
    console.error(err);
    itemsContainer.innerHTML = `
      <div class="alert alert-danger text-center">
        Erro ao carregar seus anúncios. <button class="btn btn-link p-0" onclick="location.reload()">Tentar novamente</button>
      </div>
    `;
  }
}

// Event delegation (unchanged logic, only PT-BR confirm)
itemsContainer.addEventListener("click", async e => {
  const btn = e.target.closest("[data-action]");
  if (!btn) return;

  const { action, id, offerId } = btn.dataset;

  switch (action) {
    case "view": window.location.href = `itemDetails.html?mode=view&id=${id}`; break;
    case "edit": window.location.href = `itemDetails.html?mode=edit&id=${id}`; break;
    case "delete":
      if (confirm("Tem certeza que quer excluir este anúncio?")) {
        try {
          await deleteItem(id);
          document.querySelector(`[data-item-id="${id}"]`)?.closest(".col")?.remove();
        } catch (err) {
          alert("Erro ao excluir. Tente novamente.");
        }
      }
      break;
    case "view-offers": openViewOffersModal(id); break;
    case "make-offer": openOfferDetailsModal(id, null); break;
    case "edit-offer":
      const offers = await getOffersForItem(id);
      const existing = offers.find(o => String(o.id) === String(offerId));
      openOfferDetailsModal(id, existing);
      break;
  }
});