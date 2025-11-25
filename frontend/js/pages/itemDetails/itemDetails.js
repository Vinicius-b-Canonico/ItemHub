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
import { initLocationHandler, fillLocationFields } from "./locationHandler.js";

document.addEventListener("DOMContentLoaded", async () => {
  await loadNavbar();

  const pageTitle = document.getElementById("page-title");
  const form = document.getElementById("item-form");
  const saveBtn = document.getElementById("save-btn");
  const deleteBtn = document.getElementById("delete-btn");
  const cancelBtn = document.getElementById("cancel-btn");
  const categorySelect = document.getElementById("category");

  const mainImageEl = document.getElementById("mainImage");
  const noImagePlaceholder = document.getElementById("noImagePlaceholder");
  const prevBtn = document.getElementById("prevBtn");
  const nextBtn = document.getElementById("nextBtn");
  const thumbnailsEl = document.getElementById("thumbnails");
  const imageViewer = document.getElementById("imageViewer");

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
    categorySelect.innerHTML = `<option value="">(erro ao carregar)</option>`;
  }

  pageTitle.textContent = mode === "create" ? "Criar Anúncio" : mode === "edit" ? "Editar Anúncio" : "Detalhes do Item";

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

  const isEditable = mode === "create" || mode === "edit";

  // Create hidden file input
  const fileInput = document.createElement("input");
  fileInput.type = "file";
  fileInput.accept = "image/*";
  fileInput.multiple = true;
  fileInput.style.display = "none";
  document.body.appendChild(fileInput);

  fileInput.addEventListener("change", (e) => handleImageUpload(e.target.files, mode, itemId, imageState, imageElements));

  // Make viewer a dropzone if editable
  if (isEditable) {
    imageViewer.addEventListener("click", () => fileInput.click());

    imageViewer.addEventListener("dragover", (e) => {
      e.preventDefault();
      imageViewer.classList.add("drag-over");
    });

    imageViewer.addEventListener("dragleave", () => imageViewer.classList.remove("drag-over"));

    imageViewer.addEventListener("drop", (e) => {
      e.preventDefault();
      imageViewer.classList.remove("drag-over");
      handleImageUpload(e.dataTransfer.files, mode, itemId, imageState, imageElements);
    });
  }

  if (mode !== "create" && itemId) {
    try {
      loadedItem = await getItem(itemId);
      helpers.fillForm(loadedItem);
      await fillLocationFields(loadedItem);

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

      image.renderAllImages(imageState, imageElements, mode, isEditable); // Pass isEditable

      if (mode === "view") {
        helpers.disableForm(form);
        saveBtn.classList.add("d-none");
        deleteBtn.classList.add("d-none");
        await offerHandler.injectOfferButtons(loadedItem, currentUser);
      } else {
        deleteBtn.classList.remove("d-none");
      }
    } catch (err) {
      console.error(err);
      helpers.showAlert("danger", "Erro ao carregar anúncio.");
    }
  } else {
    image.renderAllImages(imageState, imageElements, mode, isEditable); // Pass isEditable
  }

  prevBtn.addEventListener("click", () => {
    if (imageState.currentIndex > 0) {
      imageState.currentIndex--;
      image.renderAllImages(imageState, imageElements, mode, isEditable);
    }
  });

  nextBtn.addEventListener("click", () => {
    if (imageState.currentIndex < image.combinedCount(imageState) - 1) {
      imageState.currentIndex++;
      image.renderAllImages(imageState, imageElements, mode, isEditable);
    }
  });

  document.addEventListener("keydown", (ev) => {
    if (document.activeElement && (document.activeElement.tagName === "INPUT" || document.activeElement.tagName === "TEXTAREA")) return;
    if (image.combinedCount(imageState) <= 1) return;
    if (ev.key === "ArrowLeft") {
      if (imageState.currentIndex > 0) {
        imageState.currentIndex--;
        image.renderAllImages(imageState, imageElements, mode, isEditable);
      }
    } else if (ev.key === "ArrowRight") {
      if (imageState.currentIndex < image.combinedCount(imageState) - 1) {
        imageState.currentIndex++;
        image.renderAllImages(imageState, imageElements, mode, isEditable);
      }
    }
  });

  window.addEventListener("beforeunload", () => {
    for (const url of imageState.newImagePreviews) {
      try { URL.revokeObjectURL(url); } catch {}
    }
  });

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

// Handler for file add (from click or drop)
async function handleImageUpload(fileList, mode, itemId, imageState, imageElements) {
  const files = Array.from(fileList).filter(f => f.type.startsWith("image/"));
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
        console.error("Erro ao subir imagem:", err);
        helpers.showAlert("danger", "Erro ao subir imagem.");
      }
    }
  } else {
    for (const f of files) {
      imageState.newImages.push(f);
      imageState.newImagePreviews.push(URL.createObjectURL(f));
    }
    imageState.newImageOrder = imageState.newImages.map((_, idx) => idx);
  }

  // Set to last added (last selected/uploaded as main)
  imageState.currentIndex = imageState.existingImages.length + imageState.newImages.length - 1;

  image.renderAllImages(imageState, imageElements, mode, mode === "create" || mode === "edit");
}