// imageHandler.js
import { normalizeImageUrl } from "../../utils/misc.js";

export function combinedCount(imageState) {
  return imageState.existingImages.length + imageState.newImages.length;
}

export function getImageAt(index, imageState) {
  const existingLen = imageState.existingImages.length;

  if (index < existingLen) {
    return {
      type: "existing",
      src: normalizeImageUrl(imageState.existingImages[index].image_url),
      meta: imageState.existingImages[index],
    };
  } else {
    const ni = index - existingLen;
    return {
      type: "new",
      src: imageState.newImagePreviews[ni],
      meta: { file: imageState.newImages[ni] },
    };
  }
}

export function renderAllImages(imageState, imageElements, mode, isEditable = false) {
  const count = combinedCount(imageState);

  // Controle do botão flutuante (se existir no DOM)
  const floatingBtn = document.getElementById("floatingAddBtn");
  if (floatingBtn) {
    if (isEditable && count > 0) {
      floatingBtn.classList.remove("d-none");
    } else {
      floatingBtn.classList.add("d-none");
    }
  }

  if (count === 0) {
    imageElements.mainImageEl.classList.add("d-none");
    imageElements.noImagePlaceholder.classList.remove("d-none");
    
    if (isEditable) {
      imageElements.noImagePlaceholder.innerHTML = `
        <div class="text-center py-5">
          <i class="bi bi-images display-1 text-muted mb-4"></i>
          <h5 class="text-muted mb-4">Nenhuma imagem adicionada</h5>
          <button type="button" id="addImagesBtn" class="btn btn-primary btn-lg px-5">
            <i class="bi bi-plus-circle me-2"></i>Adicionar Imagens
          </button>
        </div>
      `;
      // Re-attach event listener se o botão foi recriado
      const newBtn = document.getElementById("addImagesBtn");
      if (newBtn && !newBtn.dataset.listenerAttached) {
        newBtn.dataset.listenerAttached = "true";
        newBtn.addEventListener("click", () => {
          const fileInput = document.querySelector('input[type="file"][accept="image/*"]');
          fileInput?.click();
        });
      }
    } else {
      imageElements.noImagePlaceholder.innerHTML = "Sem imagens disponíveis";
    }

    imageElements.prevBtn.classList.add("disabled");
    imageElements.nextBtn.classList.add("disabled");
    imageElements.thumbnailsEl.innerHTML = "";
    return;
  }

  imageElements.noImagePlaceholder.classList.add("d-none");
  imageElements.mainImageEl.classList.remove("d-none");

  if (imageState.currentIndex >= count) {
    imageState.currentIndex = Math.max(0, count - 1);
  }

  renderMainImage(imageState, imageElements);
  renderThumbnails(imageState, imageElements, mode);
  updateArrows(imageState, imageElements);
}

function renderMainImage(imageState, imageElements) {
  const img = getImageAt(imageState.currentIndex, imageState);
  imageElements.mainImageEl.style.opacity = 0;
  imageElements.mainImageEl.src = img.src;
  imageElements.mainImageEl.onload = () => {
    imageElements.mainImageEl.style.opacity = 1;
  };
}

function renderThumbnails(imageState, imageElements, mode) {
  imageElements.thumbnailsEl.innerHTML = "";
  const total = combinedCount(imageState);
  let dragSrcIndex = null;

  for (let i = 0; i < total; i++) {
    const img = getImageAt(i, imageState);
    const div = document.createElement("div");
    div.className = "thumb shadow-sm hover-shadow rounded-3";
    if (i === imageState.currentIndex) div.classList.add("border-primary", "border-2");

    const isEditableLocal = mode === "edit" || mode === "create";

    if (isEditableLocal) {
      div.draggable = true;
      div.dataset.index = i;

      div.addEventListener("dragstart", (e) => {
        dragSrcIndex = parseInt(e.currentTarget.dataset.index);
        e.dataTransfer.effectAllowed = "move";
        div.classList.add("opacity-50");
      });

      div.addEventListener("dragend", () => div.classList.remove("opacity-50"));

      div.addEventListener("dragover", (e) => {
        e.preventDefault();
        e.dataTransfer.dropEffect = "move";
        div.classList.add("border-primary");
      });

      div.addEventListener("dragleave", () => div.classList.remove("border-primary"));

      div.addEventListener("drop", (e) => {
        e.preventDefault();
        div.classList.remove("border-primary");

        const dropIndex = parseInt(e.currentTarget.dataset.index);
        if (dropIndex === dragSrcIndex) return;

        reorderImages(dragSrcIndex, dropIndex, imageState);
        renderAllImages(imageState, imageElements, mode, isEditableLocal);
      });

      const dragHandle = document.createElement("div");
      dragHandle.className = "position-absolute top-0 start-0 p-1 bg-white rounded shadow-sm";
      dragHandle.innerHTML = `<i class="bi bi-arrows-move text-muted"></i>`;
      div.appendChild(dragHandle);
    }

    const im = document.createElement("img");
    im.src = img.src;
    im.style.width = "100%";
    im.style.height = "100%";
    im.style.objectFit = "cover";
    div.appendChild(im);

    if (isEditableLocal) {
      const delBtn = document.createElement("button");
      delBtn.type = "button";
      delBtn.className = "position-absolute bottom-0 end-0 btn btn-sm btn-danger rounded-circle p-1";
      delBtn.innerHTML = `<i class="bi bi-trash"></i>`;
      div.appendChild(delBtn);

      delBtn.addEventListener("click", (e) => {
        e.stopPropagation();

        const existingLen = imageState.existingImages.length;
        if (i < existingLen) {
          const imageId = imageState.existingImages[i].id;
          if (imageId) imageState.deleteImageIds.add(imageId);
          imageState.existingImages.splice(i, 1);
        } else {
          const ni = i - existingLen;
          imageState.newImages.splice(ni, 1);
          imageState.newImagePreviews.splice(ni, 1);
        }

        if (imageState.currentIndex >= combinedCount(imageState)) {
          imageState.currentIndex = Math.max(0, combinedCount(imageState) - 1);
        }

        renderAllImages(imageState, imageElements, mode, isEditableLocal);
      });
    }

    div.addEventListener("click", (e) => {
      if (e.target.closest("button")) return;
      imageState.currentIndex = i;
      renderAllImages(imageState, imageElements, mode, isEditableLocal);
    });

    imageElements.thumbnailsEl.appendChild(div);
  }
}

function reorderImages(fromIndex, toIndex, imageState) {
  const existingLen = imageState.existingImages.length;
  const fromExisting = fromIndex < existingLen;
  const toExisting = toIndex < existingLen;

  if (fromExisting !== toExisting) return;

  if (fromExisting) {
    const item = imageState.existingImages.splice(fromIndex, 1)[0];
    imageState.existingImages.splice(toIndex, 0, item);
  } else {
    const f = fromIndex - existingLen;
    const t = toIndex - existingLen;

    const file = imageState.newImages.splice(f, 1)[0];
    const preview = imageState.newImagePreviews.splice(f, 1)[0];

    imageState.newImages.splice(t, 0, file);
    imageState.newImagePreviews.splice(t, 0, preview);
  }

  imageState.currentIndex = toIndex;
}

function updateArrows(imageState, imageElements) {
  const count = combinedCount(imageState);
  if (count <= 1) {
    imageElements.prevBtn.classList.add("disabled");
    imageElements.nextBtn.classList.add("disabled");
    return;
  }
  imageElements.prevBtn.classList.toggle("disabled", imageState.currentIndex <= 0);
  imageElements.nextBtn.classList.toggle("disabled", imageState.currentIndex >= count - 1);
}