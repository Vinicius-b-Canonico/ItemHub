import { loadNavbar } from "../components/navbar.js";
import { getCurrentUser } from "../api/authApi.js";
import { createItem, getItem, updateItem, deleteItem, getItemCategories } from "../api/itemsApi.js";
import { normalizeImageUrl } from "../utils/misc.js";

// ⭐ NEW — import modal handlers and offer API
import { openViewOffersModal, openOfferDetailsModal } from "../components/offersModals.js";
import { getOffersForItem, apiCancelOffer } from "../api/offersApi.js";

document.addEventListener("DOMContentLoaded", async () => {
  await loadNavbar();

  const alertContainer = document.getElementById("alertContainer");
  const pageTitle = document.getElementById("page-title");
  const form = document.getElementById("item-form");
  const saveBtn = document.getElementById("save-btn");
  const deleteBtn = document.getElementById("delete-btn");
  const cancelBtn = document.getElementById("cancel-btn");
  const categorySelect = document.getElementById("category");
  const imagePreview = document.getElementById("image-preview");
  const imagePreviewContainer = document.getElementById("image-preview-container");

  const params = new URLSearchParams(window.location.search);
  const itemId = params.get("id");
  const mode = itemId ? (params.get("mode") || "view") : "create";

  // Require auth
  let currentUser = null;
  try {
    currentUser = await getCurrentUser();
    if (!currentUser?.username) {
      window.location.href = "login.html";
      return;
    }
  } catch {
    window.location.href = "login.html";
    return;
  }

  // Load categories
  try {
    const categories = await getItemCategories();
    categorySelect.innerHTML = categories
      .map(c => `<option value="${c}">${c}</option>`)
      .join("");
  } catch {
    categorySelect.innerHTML = `<option value="">(failed to load)</option>`;
  }

  // Configure page based on mode
  pageTitle.textContent =
    mode === "create" ? "Create Item"
    : mode === "edit" ? "Edit Item"
    : "Item Details";

  let loadedItem = null;

  if (mode !== "create" && itemId) {
    try {
      loadedItem = await getItem(itemId);
      fillForm(loadedItem);

      // Show preview if image exists
      if (loadedItem.image_url) {
        const normalized = normalizeImageUrl(loadedItem.image_url);
        imagePreview.src = normalized;
        imagePreviewContainer.classList.remove("d-none");
      }

      if (mode === "view") {
        disableForm();
        saveBtn.classList.add("d-none");

        // ⭐ NEW — inject offer buttons
        await injectOfferButtons(loadedItem, currentUser);
      } else {
        deleteBtn.classList.remove("d-none");
      }
    } catch {
      showAlert("danger", "Failed to load item details.");
    }
  }

  // Live image preview
  document.getElementById("image").addEventListener("change", e => {
    const file = e.target.files[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = () => {
        imagePreview.src = reader.result;
        imagePreviewContainer.classList.remove("d-none");
      };
      reader.readAsDataURL(file);
    }
  });

  // Save / Create
  form.addEventListener("submit", async (e) => {
    e.preventDefault();
    const data = collectFormData();

    try {
      if (mode === "create") {
        await createItem(
          data.title,
          data.category,
          data.duration_days,
          data.description,
          data.offer_type,
          data.volume,
          data.location,
          data.image
        );
        showAlert("success", "✅ Item created successfully!");
        setTimeout(() => window.location.href = "myItems.html", 1200);

      } else if (mode === "edit" && itemId) {
        await updateItem(itemId, data);
        showAlert("success", "✅ Item updated successfully!");
        setTimeout(() => window.location.href = "myItems.html", 1200);

      }
      else
      {
        console.log("not setting any timeout");
      }
      
    } catch (err) {
      showAlert("danger", `❌ ${err.message || "Error saving item."}`);
    }
  });

  deleteBtn.addEventListener("click", async () => {
    if (!confirm("Are you sure you want to delete this item?")) return;
    try {
      await deleteItem(itemId);
      showAlert("success", "✅ Item deleted successfully!");
      setTimeout(() => (window.location.href = "myItems.html"), 1200);
    } catch (err) {
      showAlert("danger", `❌ ${err.message || "Error deleting item."}`);
    }
  });

  cancelBtn.addEventListener("click", () => {
    if (document.referrer && document.referrer !== window.location.href) {
      window.history.back();
    } else {
      window.location.href = "myItems.html";
    }
  });

  function fillForm(item) {
    document.getElementById("title").value = item.title || "";
    document.getElementById("category").value = item.category || "";
    document.getElementById("duration_days").value = item.duration_days || "7";
    document.getElementById("description").value = item.description || "";
    document.getElementById("offer_type").value = item.offer_type || "free";
    document.getElementById("volume").value = item.volume || "";
    document.getElementById("location").value = item.location || "";
  }

  function disableForm() {
    [...form.elements].forEach(el => {
      if (el.id !== "cancel-btn") el.disabled = true;
    });
  }

  function collectFormData() {
    return {
      title: document.getElementById("title").value,
      category: document.getElementById("category").value,
      duration_days: parseInt(document.getElementById("duration_days").value),
      description: document.getElementById("description").value,
      offer_type: document.getElementById("offer_type").value,
      volume: document.getElementById("volume").value || null,
      location: document.getElementById("location").value,
      image: document.getElementById("image").files[0] || null
    };
  }

  function showAlert(type, message) {
    alertContainer.innerHTML = `
      <div class="alert alert-${type} alert-dismissible fade show" role="alert">
        ${message}
        <button type="button" class="btn-close" data-bs-dismiss="alert"></button>
      </div>`;
  }

  // ⭐ NEW — Offer button injection
  async function injectOfferButtons(item, currentUser) {
    const group = document.getElementById("button-group");
    const deleteBtn = document.getElementById("delete-btn");

    const isOwner = item.owner_id === currentUser.id;

    // OWNER → only show "View Offers"
    if (isOwner) {
      const btn = document.createElement("button");
      btn.className = "btn btn-success";
      btn.textContent = "View Offers";
      btn.onclick = () => openViewOffersModal(item.id);
      group.appendChild(btn);

      return;
    }

    // NON-OWNER: check if the user has an offer
    const offers = await getOffersForItem(item.id);
    const userOffer = offers.find(o => o.user_id === currentUser.id);

    // Hide delete-item button because non-owners can never delete
    deleteBtn.classList.add("d-none");

    if (userOffer) {
      // --- VIEW/EDIT button ---
      const btnEdit = document.createElement("button");
      btnEdit.className = "btn btn-warning";
      btnEdit.textContent = "View / Edit My Offer";
      btnEdit.onclick = () => openOfferDetailsModal(item.id, userOffer);
      group.appendChild(btnEdit);

      // --- NEW: Cancel Offer button ---
      const btnCancelOffer = document.createElement("button");
      btnCancelOffer.className = "btn btn-danger";
      btnCancelOffer.textContent = "Cancel My Offer";

      btnCancelOffer.onclick = async () => {
        if (!confirm("Are you sure you want to cancel your offer?")) return;

        try {
          await apiCancelOffer(userOffer.id);
          showAlert("success", "✅ Your offer has been cancelled!");
          setTimeout(() => window.location.reload(), 900);
        } catch (err) {
          showAlert("danger", `❌ ${err.message || "Error cancelling offer."}`);
        }
      };

      group.appendChild(btnCancelOffer);

    } else {
      // --- MAKE OFFER button ---
      const btnNew = document.createElement("button");
      btnNew.className = "btn btn-success";
      btnNew.textContent = "Make Offer";
      btnNew.onclick = () => openOfferDetailsModal(item.id, null);
      group.appendChild(btnNew);
    }
  }

  
});
