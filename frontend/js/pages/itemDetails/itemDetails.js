// itemDetails.js
import { loadNavbar } from "../../components/navbar.js";
import { getCurrentUser } from "../../api/authApi.js";
import {
  getItem,
  getItemCategories,
  uploadItemImage
} from "../../api/itemsApi.js";

import * as image from "./imageHandler.js";
import * as helpers from "./helpers.js";
import * as formHandler from "./formHandler.js";
import * as offerHandler from "./offerHandler.js";
import { initLocationHandler, fillLocationFields } from "./locationHandler.js"; // ← NEW

document.addEventListener("DOMContentLoaded", async () => {
  await loadNavbar();

  const pageTitle = document.getElementById("page-title");
  const form = document.getElementById("item-form");
  const saveBtn = document.getElementById("save-btn");
  const deleteBtn = document.getElementById("delete-btn");
  const cancelBtn = document.getElementById("cancel-btn");
  const categorySelect = document.getElementById("category");

  const imageInput = document.getElementById("images");
  const mainImageEl = document.getElementById("mainImage");
  const noImagePlaceholder = document.getElementById("noImagePlaceholder");
  const prevBtn = document.getElementById("prevBtn");
  const nextBtn = document.getElementById("nextBtn");
  const thumbnailsEl = document.getElementById("thumbnails");

  const params = new URLSearchParams(window.location.search);
  const itemId = params.get("id");
  const mode = itemId ? (params.get("mode") || "view") : "create";

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

  try {
    const categories = await getItemCategories();
    categorySelect.innerHTML = categories
      .map((c) => `<option value="${c}">${c}</option>`)
      .join("");
  } catch {
    categorySelect.innerHTML = `<option value="">(failed to load)</option>`;
  }

  pageTitle.textContent =
    mode === "create" ? "Create Item" : mode === "edit" ? "Edit Item" : "Item Details";

  // ← NEW: Initialize location autocomplete (states + cities)
  await initLocationHandler();

  let loadedItem = null;

  const imageState = {
    existingImages: [],
    newImages: [],
    newImagePreviews: [],
    existingImageOrder: [],
    newImageOrder: [],
    deleteImageIds: new Set(),
    currentIndex: 0,
  };

  const imageElements = {
    mainImageEl,
    noImagePlaceholder,
    prevBtn,
    nextBtn,
    thumbnailsEl,
  };

  if (mode !== "create" && itemId) {
    try {
      loadedItem = await getItem(itemId);
      helpers.fillForm(loadedItem);           // ← fills title, category, etc.
      await fillLocationFields(loadedItem);         // ← fills state, city, address

      // Images loading (unchanged)
      imageState.existingImages = [];
      imageState.existingImageOrder = [];

      if (loadedItem.images && Array.isArray(loadedItem.images) && loadedItem.images.length) {
        for (const img of loadedItem.images) {
          imageState.existingImages.push({
            id: img.id,
            image_url: img.image_url || img.imageUrl || null,
          });
          imageState.existingImageOrder.push(img.id);
        }
      } else if (loadedItem.image_url) {
        imageState.existingImages.push({ id: null, image_url: loadedItem.image_url });
        imageState.existingImageOrder.push(null);
      }

      image.renderAllImages(imageState, imageElements, mode);

      if (mode === "view") {
        helpers.disableForm(form);
        saveBtn.classList.add("d-none");
        imageInput.classList.add("d-none");
        deleteBtn.classList.add("d-none");
        await offerHandler.injectOfferButtons(loadedItem, currentUser);
      } else {
        deleteBtn.classList.remove("d-none");
      }
    } catch (err) {
      console.error(err);
      helpers.showAlert("danger", "Failed to load item details.");
    }
  } else {
    image.renderAllImages(imageState, imageElements, mode);
  }

  // Image navigation (unchanged)
  prevBtn.addEventListener("click", () => {
    if (imageState.currentIndex > 0) {
      imageState.currentIndex--;
      image.renderAllImages(imageState, imageElements, mode);
    }
  });

  nextBtn.addEventListener("click", () => {
    if (imageState.currentIndex < image.combinedCount(imageState) - 1) {
      imageState.currentIndex++;
      image.renderAllImages(imageState, imageElements, mode);
    }
  });

  document.addEventListener("keydown", (ev) => {
    if (document.activeElement && (document.activeElement.tagName === "INPUT" || document.activeElement.tagName === "TEXTAREA")) return;
    if (image.combinedCount(imageState) <= 1) return;
    if (ev.key === "ArrowLeft") {
      if (imageState.currentIndex > 0) {
        imageState.currentIndex--;
        image.renderAllImages(imageState, imageElements, mode);
      }
    } else if (ev.key === "ArrowRight") {
      if (imageState.currentIndex < image.combinedCount(imageState) - 1) {
        imageState.currentIndex++;
        image.renderAllImages(imageState, imageElements, mode);
      }
    }
  });

  // Image upload (unchanged)
  imageInput.addEventListener("change", async (e) => {
    const files = Array.from(e.target.files || []);
    if (!files.length) return;

    if (mode === "edit") {
      for (const f of files) {
        try {
          const uploaded = await uploadItemImage(itemId, f);
          imageState.existingImages.push({
            id: uploaded.id,
            image_url: uploaded.image_url,
          });
          imageState.existingImageOrder.push(uploaded.id);
        } catch (err) {
          console.error("Failed to upload image:", err);
          helpers.showAlert("danger", "Failed to upload image.");
        }
      }
    } else {
      for (const f of files) {
        imageState.newImages.push(f);
        const objUrl = URL.createObjectURL(f);
        imageState.newImagePreviews.push(objUrl);
      }
      imageState.newImageOrder = imageState.newImages.map((_, idx) => idx);
    }

    if (image.combinedCount(imageState) > 0) {
      imageState.currentIndex = image.combinedCount(imageState) - files.length;
    }

    image.renderAllImages(imageState, imageElements, mode);
  });

  window.addEventListener("beforeunload", () => {
    for (const url of imageState.newImagePreviews) {
      try { URL.revokeObjectURL(url); } catch {}
    }
  });

  // Submit (unchanged – formHandler will now use new collectFormData)
  form.addEventListener("submit", (e) => formHandler.handleSubmit(e, mode, itemId, imageState));

  deleteBtn.addEventListener("click", () => formHandler.handleDelete(itemId));

  cancelBtn.addEventListener("click", () => {
    if (document.referrer && document.referrer !== window.location.href) {
      window.history.back();
    } else {
      window.location.href = "myItems.html";
    }
  });
});