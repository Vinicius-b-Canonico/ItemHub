import { openViewOffersModal, openOfferDetailsModal } from "../../components/offersModals.js";
import { getOffersForItem, apiCancelOffer } from "../../api/offersApi.js";
import * as helpers from "./helpers.js";

export async function injectOfferButtons(item, currentUser) {
  const group = document.getElementById("button-group");
  const deleteBtnLocal = document.getElementById("delete-btn");

  const isOwner = item.owner_id === currentUser.id;

  if (isOwner) {
    const btn = document.createElement("button");
    btn.className = "btn btn-success";
    btn.textContent = "View Offers";
    btn.onclick = () => openViewOffersModal(item.id);
    group.appendChild(btn);

    return;
  }

  const offers = await getOffersForItem(item.id);
  const userOffer = offers.find((o) => o.user_id === currentUser.id);

  deleteBtnLocal.classList.add("d-none");

  if (userOffer) {
    const btnEdit = document.createElement("button");
    btnEdit.className = "btn btn-warning";
    btnEdit.textContent = "View / Edit My Offer";
    btnEdit.onclick = () => openOfferDetailsModal(item.id, userOffer);
    group.appendChild(btnEdit);

    const btnCancelOffer = document.createElement("button");
    btnCancelOffer.className = "btn btn-danger";
    btnCancelOffer.textContent = "Cancel My Offer";

    btnCancelOffer.onclick = async () => {
      if (!confirm("Are you sure you want to cancel your offer?")) return;

      try {
        await apiCancelOffer(userOffer.id);
        helpers.showAlert("success", "✅ Your offer has been cancelled!");
        setTimeout(() => window.location.reload(), 900);
      } catch (err) {
        helpers.showAlert("danger", `❌ ${err.message || "Error cancelling offer."}`);
      }
    };

    group.appendChild(btnCancelOffer);
  } else {
    const btnNew = document.createElement("button");
    btnNew.className = "btn btn-success";
    btnNew.textContent = "Make Offer";
    btnNew.onclick = () => openOfferDetailsModal(item.id, null);
    group.appendChild(btnNew);
  }
}