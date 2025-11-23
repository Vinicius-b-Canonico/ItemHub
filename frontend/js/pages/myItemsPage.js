import { renderItemCard } from "../components/itemCard.js";
import { getCurrentUser } from "../api/authApi.js";

import {
  getOffersForItem,
} from "../api/offersApi.js";

import { deleteItem, listItems } from "../api/itemsApi.js";
import { loadNavbar } from "../components/navbar.js";

import {
  openViewOffersModal,
  openOfferDetailsModal       
} from "../components/offersModals.js";

const itemsContainer = document.getElementById("itemsContainer");


document.addEventListener("DOMContentLoaded", async () => {
  await loadNavbar();


  const currentUser = await getCurrentUser();
  if (!currentUser) {
    alert("Please log in to view your items.");
    window.location.href = "/login.html";
    return;
  }

  await loadUserItems(currentUser);
});


/* ============================================================
   LOAD USER ITEMS
   ============================================================ */
async function loadUserItems(currentUser) {
  try {
    itemsContainer.innerHTML = `
      <div class="text-muted text-center py-4">Loading your items...</div>
    `;

    console.log("will list items of user id: " + currentUser.id);
    const { items } = await listItems({
      category: "",
      owner_id: currentUser.id,
      status: "ativo",
      page: 1,
      page_size: 9999  // get all user items at once (user inventory is normally small)
    });


    if (!items.length) {
      itemsContainer.innerHTML = `
        <div class="alert alert-info text-center">You haven’t listed any items yet.</div>
      `;
      return;
    }

    renderItems(items, currentUser);
  } catch (err) {
    console.error("Error loading items:", err);
    itemsContainer.innerHTML = `
      <div class="alert alert-danger text-center">Error loading your items.</div>
    `;
  }
}


function renderItems(items, currentUser) {
  itemsContainer.innerHTML = `
    <div class="row row-cols-1 row-cols-md-2 row-cols-lg-3 g-3">
      ${items.map(item => renderItemCard(item, currentUser, false)).join("")}
    </div>
  `;
}


document.getElementById("btnAddItem").addEventListener("click", () => {
  window.location.href = "itemDetails.html?mode=create";
});

/* ============================================================
   EVENT DELEGATION
   ============================================================ */
itemsContainer.addEventListener("click", async e => {
  const btn = e.target.closest("[data-action]");
  if (!btn) return;

  const { action, id, offerId } = btn.dataset;

  switch (action) {

    case "view":
      window.location.href = `itemDetails.html?mode=view&id=${id}`;
      break;

    case "edit":
      window.location.href = `itemDetails.html?mode=edit&id=${id}`;
      break;

    case "delete":
      confirmDeleteItem(id);
      break;

    case "view-offers":
      openViewOffersModal(id);
      break;

    case "make-offer":
      openOfferDetailsModal(id, null);
      break;

    case "edit-offer": {
      const offers = await getOffersForItem(id);
      const existing = offers.find(o => String(o.id) === String(offerId));
      openOfferDetailsModal(id, existing);
      break;
    }

    default:
      console.warn("Unhandled action:", action);
  }
});


/* ============================================================
   DELETE ITEM
   ============================================================ */
async function confirmDeleteItem(itemId) {
  if (!confirm("Are you sure you want to delete this item?")) return;

  try {
    await deleteItem(itemId);  

    document
      .querySelector(`[data-item-id="${itemId}"]`)
      ?.remove();

  } catch (err) {
    console.error("Delete error:", err);
    alert("Could not delete item. Please try again.");
  }
}