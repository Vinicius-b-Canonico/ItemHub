// offerHandler.js
import { openViewOffersModal, openOfferDetailsModal } from "../../components/offersModals.js";
import { getOffersForItem, apiCancelOffer } from "../../api/offersApi.js";
import * as helpers from "./helpers.js";
import { showSuccessModal } from "../../components/resultModals.js";

export async function injectOfferButtons(item, currentUser) {
  const group = document.getElementById("button-group");
  const deleteBtn = document.getElementById("delete-btn");

  const isOwner = item.owner_id === currentUser.id;

  // Limpa botões anteriores
  const existingOfferBtns = group.querySelectorAll(".offer-action-btn");
  existingOfferBtns.forEach(b => b.remove());

  if (isOwner) {
    const btn = document.createElement("button");
    btn.className = "btn btn-success btn-lg px-5 offer-action-btn";
    btn.innerHTML = `<i class="bi bi-handshake me-2"></i> Ver Propostas`;
    btn.onclick = () => openViewOffersModal(item.id);
    group.appendChild(btn);
    return;
  }

  const offers = await getOffersForItem(item.id);
  const userOffer = offers.find(o => o.user_id === currentUser.id);

  deleteBtn.classList.add("d-none");

  if (userOffer) {
    const btnEdit = document.createElement("button");
    btnEdit.className = "btn btn-warning btn-lg px-5 offer-action-btn";
    btnEdit.innerHTML = `<i class="bi bi-pencil me-2"></i> Editar Minha Proposta`;
    btnEdit.onclick = () => openOfferDetailsModal(item.id, userOffer);
    group.appendChild(btnEdit);

    const btnCancel = document.createElement("button");
    btnCancel.className = "btn btn-danger btn-lg px-5 offer-action-btn ms-2";
    btnCancel.innerHTML = `<i class="bi bi-x-circle me-2"></i> Cancelar Proposta`;
    btnCancel.onclick = async () => {
      if (!confirm("Tem certeza que deseja cancelar sua proposta?")) return;
      try {
        await apiCancelOffer(userOffer.id);
        showSuccessModal({ message: "Sua proposta foi cancelada." });
        setTimeout(() => location.reload(), 1200);
      } catch (err) {
        helpers.showAlert("danger", err.message || "Erro ao cancelar proposta.");
      }
    };
    group.appendChild(btnCancel);
  } else {
    const btnNew = document.createElement("button");
    btnNew.className = "btn btn-primary btn-lg px-5 offer-action-btn";
    btnNew.innerHTML = `<i class="bi bi-plus-circle me-2"></i> Fazer Proposta`;
    btnNew.onclick = () => openOfferDetailsModal(item.id);
    group.appendChild(btnNew);
  }
}