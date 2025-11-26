// js/pages/marketplace/events.js
import { MPState } from "./state.js";
import { deleteItem } from "../../api/itemsApi.js";
import { getOffersForItem } from "../../api/offersApi.js";
import { openOfferDetailsModal, openViewOffersModal } from "../../components/offersModals.js";

export function initItemCardClicks() {
  MPState.itemsContainer.addEventListener("click", async e => {
    const btn = e.target.closest("[data-action]");
    if (!btn) return;

    const { action, id, offerId } = btn.dataset;

    switch (action) {
      case "view":
        location.href = `itemDetails.html?mode=view&id=${id}`;
        break;
      /** OWNER ACTIONS **/
      case "edit":
        window.location.href = `itemDetails.html?mode=edit&id=${id}`;
        break;

      case "delete":
        if (!confirm("Tem certeza que quer excluir este anúncio?")) return;

        try {
          await deleteItem(id);
          document.querySelector(`[data-item-id="${id}"]`)?.closest(".col")?.remove();
        } catch (err) {
          console.error(err);
          alert("Erro ao excluir. Tente novamente.");
        }
        break;

      case "view-offers":
        openViewOffersModal(id);
        break;

      /** BUYER ACTIONS **/
      case "make-offer":
        if (!MPState.currentUser) {
          alert("Faça login para fazer uma proposta.");
          return;
        }
        openOfferDetailsModal(id, null);
        break;

      case "edit-offer":
        if (!MPState.currentUser) {
          alert("Faça login para editar sua proposta.");
          return;
        }

        let existing = MPState.myOffersByItemId[id]?.offer;

        // fallback (if not preloaded)
        if (!existing) {
          const offers = await getOffersForItem(id);
          existing = offers.find(o => String(o.id) === String(offerId));
        }

        if (!existing) {
          alert("Proposta não encontrada.");
          return;
        }

        openOfferDetailsModal(id, existing);
        break;
    }
  });
}
