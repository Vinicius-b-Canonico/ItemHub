import { loadNavbar } from "../components/navbar.js";
import { getCurrentUser } from "../api/authApi.js";
import {
  createItem,
  getItem,
  updateItem,
  deleteItem,
  getItemCategories,
  uploadItemImage
} from "../api/itemsApi.js";
import { normalizeImageUrl } from "../utils/misc.js";

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

  // Image viewer elements
  const imageInput = document.getElementById("images");
  const mainImageEl = document.getElementById("mainImage");
  const noImagePlaceholder = document.getElementById("noImagePlaceholder");
  const prevBtn = document.getElementById("prevBtn");
  const nextBtn = document.getElementById("nextBtn");
  const thumbnailsEl = document.getElementById("thumbnails");

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
      .map((c) => `<option value="${c}">${c}</option>`)
      .join("");
  } catch {
    categorySelect.innerHTML = `<option value="">(failed to load)</option>`;
  }

  // Configure page based on mode
  pageTitle.textContent =
    mode === "create" ? "Create Item" : mode === "edit" ? "Edit Item" : "Item Details";

  let loadedItem = null;

  // Image state
  // existingImages: array of { id?, image_url } (from server)
  let existingImages = [];
  // newImages: array of File objects
  let newImages = [];
  // previews for newImages: array of dataURLs or objectURLs for thumbnails
  let newImagePreviews = [];
  // new: order tracking
  let existingImageOrder = [];   // array of existing image IDs in current order
  let newImageOrder = [];        // array of indexes for new images in current order


  // deleted existing image ids
  let deleteImageIds = new Set();
  // current visible index in the combined list (existing first, then new)
  let currentIndex = 0;

  if (mode !== "create" && itemId) {
    try {
      loadedItem = await getItem(itemId);
      fillForm(loadedItem);

      // Build existingImages from response: use 'images' if present else fallback to image_url
      existingImages = [];
      existingImageOrder = []; // populate order here

      if (loadedItem.images && Array.isArray(loadedItem.images) && loadedItem.images.length) {
        for (const img of loadedItem.images) {
          existingImages.push({
            id: img.id,
            image_url: img.image_url || img.imageUrl || null,
          });

          // store order (id may be null but still preserved)
          existingImageOrder.push(img.id);
        }
      } else if (loadedItem.image_url) {
        // legacy single-image case
        existingImages.push({ id: null, image_url: loadedItem.image_url });

        // maintain a 1-element order array even if no ID exists
        existingImageOrder.push(null);
      }

      renderAllImages();

      if (mode === "view") {
        disableForm();
        saveBtn.classList.add("d-none");
        imageInput.classList.add("d-none"); // hide upload on view
        deleteBtn.classList.add("d-none");

        // Offer buttons
        await injectOfferButtons(loadedItem, currentUser);
      } else {
        deleteBtn.classList.remove("d-none");
      }
    } catch (err) {
      console.error(err);
      showAlert("danger", "Failed to load item details.");
    }
  } else {
    // create mode: ensure initial UI
    renderAllImages();
  }

  // =========== Image viewer logic ===========

  function combinedCount() {
    return existingImages.length + newImages.length;
  }

  function getImageAt(index) {
    if (index < existingImages.length) {
      return { type: "existing", src: normalizeImageUrl(existingImages[index].image_url), meta: existingImages[index] };
    } else {
      const ni = index - existingImages.length;
      return { type: "new", src: newImagePreviews[ni], meta: { file: newImages[ni] } };
    }
  }

  function renderAllImages() {
    // If no images at all
    if (combinedCount() === 0) {
      mainImageEl.classList.add("d-none");
      noImagePlaceholder.classList.remove("d-none");
      prevBtn.classList.add("disabled");
      nextBtn.classList.add("disabled");
      thumbnailsEl.innerHTML = "";
      return;
    }

    noImagePlaceholder.classList.add("d-none");
    mainImageEl.classList.remove("d-none");

    // Clamp currentIndex
    if (currentIndex >= combinedCount()) currentIndex = Math.max(0, combinedCount() - 1);

    renderMainImage();
    renderThumbnails();
    updateArrows();
  }

  function renderMainImage() {
    const img = getImageAt(currentIndex);
    mainImageEl.style.opacity = 0;
    mainImageEl.src = img.src;
    // show once loaded
    mainImageEl.onload = () => (mainImageEl.style.opacity = 1);
    mainImageEl.classList.remove("d-none");
  }

  function renderThumbnails() {
    thumbnailsEl.innerHTML = "";
    const total = combinedCount();

    // We keep track of which index is currently being dragged
    let dragSrcIndex = null;

    for (let i = 0; i < total; i++) {
      const img = getImageAt(i);
      const div = document.createElement("div");
      div.className = "thumb";
      if (i === currentIndex) div.classList.add("active");
      if (mode === "edit") div.classList.add("edit-mode");

      // ---------- DRAG-AND-DROP SUPPORT ----------
      if (mode === "edit") {
        div.draggable = true;
        div.dataset.index = i; // keep our index for reordering

        // When dragging starts
        div.addEventListener("dragstart", (e) => {
          dragSrcIndex = parseInt(e.currentTarget.dataset.index);
          e.dataTransfer.effectAllowed = "move";
          div.classList.add("dragging");
        });

        div.addEventListener("dragend", () => {
          div.classList.remove("dragging");
        });

        // Allow drop
        div.addEventListener("dragover", (e) => {
          e.preventDefault();
          e.dataTransfer.dropEffect = "move";
          div.classList.add("drag-over");
        });

        div.addEventListener("dragleave", () => {
          div.classList.remove("drag-over");
        });

        // Handle drop — reorder arrays
        div.addEventListener("drop", (e) => {
          e.preventDefault();
          div.classList.remove("drag-over");

          const dropIndex = parseInt(e.currentTarget.dataset.index);
          if (dropIndex === dragSrcIndex) return;

          reorderImages(dragSrcIndex, dropIndex);

          // After reordering, show new list
          renderAllImages();
        });
      }
      // -------------------------------------------

      // DRAG HANDLE (visible in edit mode)
      if (mode === "edit") {
        const dragHandle = document.createElement("div");
        dragHandle.className = "drag-handle";
        dragHandle.innerHTML = `<i class="bi bi-arrows-move"></i>`;
        div.appendChild(dragHandle);
      }

      // Thumbnail image
      const im = document.createElement("img");
      im.src = img.src;
      div.appendChild(im);

      // DELETE BUTTON
      const delBtn = document.createElement("button");
      delBtn.type = "button";
      delBtn.className = "del-btn btn btn-sm btn-outline-danger";
      delBtn.innerHTML = `<i class="bi bi-trash"></i>`;
      div.appendChild(delBtn);

      // CLICK THUMBNAIL TO SELECT
      div.addEventListener("click", (e) => {
        if (e.target.closest(".del-btn")) return; // ignore delete click
        currentIndex = i;
        renderAllImages();
      });

      // DELETE LOGIC
      delBtn.addEventListener("click", (e) => {
        e.stopPropagation();

        if (i < existingImages.length) {
          const imageId = existingImages[i].id;
          if (imageId) deleteImageIds.add(imageId);
          existingImages.splice(i, 1);
        } else {
          const ni = i - existingImages.length;
          newImages.splice(ni, 1);
          newImagePreviews.splice(ni, 1);
        }

        if (currentIndex >= combinedCount()) {
          currentIndex = Math.max(0, combinedCount() - 1);
        }

        renderAllImages();
      });

      thumbnailsEl.appendChild(div);
    }
  }

  function reorderImages(fromIndex, toIndex) {
    const total = combinedCount();

    if (fromIndex < existingImages.length && toIndex < existingImages.length) {
      // existing → existing
      const item = existingImages.splice(fromIndex, 1)[0];
      existingImages.splice(toIndex, 0, item);
    } else if (fromIndex >= existingImages.length && toIndex >= existingImages.length) {
      // new → new
      const f = fromIndex - existingImages.length;
      const t = toIndex - existingImages.length;

      const file = newImages.splice(f, 1)[0];
      const preview = newImagePreviews.splice(f, 1)[0];

      newImages.splice(t, 0, file);
      newImagePreviews.splice(t, 0, preview);
    } else if (fromIndex < existingImages.length && toIndex >= existingImages.length) {
      // existing → new area
      const item = existingImages.splice(fromIndex, 1)[0];

      const t = toIndex - existingImages.length;
      newImages.splice(t, 0, null); // placeholder
      newImagePreviews.splice(t, 0, item.image_url);

      // Placeholder because existing files cannot become new files,
      // but frontend only allows reorder visually.
      // Backend will use reorder indices for existing images only.
    } else {
      // new → existing area
      // Same as above, but reversed direction
      const f = fromIndex - existingImages.length;
      newImages.splice(f, 1);
      newImagePreviews.splice(f, 1);

      const insertPos = toIndex;
      existingImages.splice(insertPos, 0, null);
    }

    // If the main image moved:
    currentIndex = toIndex;
  }


  function updateArrows() {
    if (combinedCount() <= 1) {
      prevBtn.classList.add("disabled");
      nextBtn.classList.add("disabled");
      return;
    }
    prevBtn.classList.toggle("disabled", currentIndex <= 0);
    nextBtn.classList.toggle("disabled", currentIndex >= combinedCount() - 1);
  }

  prevBtn.addEventListener("click", () => {
    if (currentIndex > 0) {
      currentIndex--;
      renderAllImages();
    }
  });
  nextBtn.addEventListener("click", () => {
    if (currentIndex < combinedCount() - 1) {
      currentIndex++;
      renderAllImages();
    }
  });

  // support keyboard arrows for viewer
  document.addEventListener("keydown", (ev) => {
    if (document.activeElement && (document.activeElement.tagName === "INPUT" || document.activeElement.tagName === "TEXTAREA")) return;
    if (combinedCount() <= 1) return;
    if (ev.key === "ArrowLeft") {
      if (currentIndex > 0) {
        currentIndex--;
        renderAllImages();
      }
    } else if (ev.key === "ArrowRight") {
      if (currentIndex < combinedCount() - 1) {
        currentIndex++;
        renderAllImages();
      }
    }
  });

  // =========== Handling new file selection ===========
  imageInput.addEventListener("change", async (e) => {
    const files = Array.from(e.target.files || []);
    if (!files.length) return;

    // append to newImages and prepare previews
    for (const f of files) {
      newImages.push(f);
      const objUrl = URL.createObjectURL(f);
      newImagePreviews.push(objUrl);
    }

    // ⭐ update order for new images
    newImageOrder = newImages.map((_, idx) => idx);

    // If there were no images before, start viewing the first new image
    if (combinedCount() > 0) {
      currentIndex = existingImages.length; // first new image
    }

    renderAllImages();
  });



  // revoke object URLs when leaving page to avoid memory leak
  window.addEventListener("beforeunload", () => {
    for (const url of newImagePreviews) {
      try { URL.revokeObjectURL(url); } catch {}
    }
  });

  // =========== Form handling ===========



  form.addEventListener("submit", async (e) => {
    e.preventDefault();

    const data = collectFormData();

    try {
      if (mode === "create") {
        // -----------------------------
        // CREATE MODE
        // -----------------------------
        const orderedNewImages = newImages.slice(); // already stored in correct order

        const mainImage = orderedNewImages.length > 0 ? orderedNewImages[0] : null;
        const extraImages = orderedNewImages.length > 1 ? orderedNewImages.slice(1) : [];

        const payload = {
          ...data,
          mainImage,
          extraImages,
        };

        await createItem(payload);
        showAlert("success", "✅ Item created successfully!");
        setTimeout(() => (window.location.href = "myItems.html"), 1200);

      } else if (mode === "edit" && itemId) {
      // -----------------------------
      // EDIT MODE
      // -----------------------------
      let mainImage = null;
      let extraImages = [];

      if (newImages.length > 0) {
        if (currentIndex >= existingImages.length) {
          // Main image is NEW
          const newIdx = currentIndex - existingImages.length;
          mainImage = newImages[newIdx];
          extraImages = newImages.filter((_, idx) => idx !== newIdx);
        } else {
          // Main is EXISTING → backend keeps old one
          extraImages = newImages.slice();
        }
      }

      const existingImageOrderlocal = existingImages.map(img => img.id); 

      const new_image_order = JSON.stringify(existingImageOrderlocal);

      const payload = {
        ...data,
        mainImage,
        extraImages,
        deleteImageIds: Array.from(deleteImageIds),
        new_image_order, 
      };
      await updateItem(itemId, payload);
      showAlert("success", "✅ Item updated successfully!");
      setTimeout(() => (window.location.href = "myItems.html"), 1200);
    }

    } catch (err) {
      console.error(err);
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

  // =========== Helpers ===========

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
    [...form.elements].forEach((el) => {
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
    };
  }

  function showAlert(type, message) {
    alertContainer.innerHTML = `
      <div class="alert alert-${type} alert-dismissible fade show" role="alert">
        ${message}
        <button type="button" class="btn-close" data-bs-dismiss="alert"></button>
      </div>`;
  }

  async function injectOfferButtons(item, currentUser) {
    const group = document.getElementById("button-group");
    const deleteBtnLocal = document.getElementById("delete-btn");

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
    const userOffer = offers.find((o) => o.user_id === currentUser.id);

    // Hide delete-item button because non-owners can never delete
    deleteBtnLocal.classList.add("d-none");

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
