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

export function renderAllImages(imageState, imageElements, mode) {
  const count = combinedCount(imageState);
  if (count === 0) {
    imageElements.mainImageEl.classList.add("d-none");
    imageElements.noImagePlaceholder.classList.remove("d-none");
    imageElements.prevBtn.classList.add("disabled");
    imageElements.nextBtn.classList.add("disabled");
    imageElements.thumbnailsEl.innerHTML = "";
    return;
  }

  imageElements.noImagePlaceholder.classList.add("d-none");
  imageElements.mainImageEl.classList.remove("d-none");

  if (imageState.currentIndex >= count) imageState.currentIndex = Math.max(0, count - 1);

  renderMainImage(imageState, imageElements);
  renderThumbnails(imageState, imageElements, mode);
  updateArrows(imageState, imageElements);
}

function renderMainImage(imageState, imageElements) {
  const img = getImageAt(imageState.currentIndex, imageState);
  imageElements.mainImageEl.style.opacity = 0;
  imageElements.mainImageEl.src = img.src;
  imageElements.mainImageEl.onload = () => (imageElements.mainImageEl.style.opacity = 1);
  imageElements.mainImageEl.classList.remove("d-none");
}

function renderThumbnails(imageState, imageElements, mode) {
  imageElements.thumbnailsEl.innerHTML = "";
  const total = combinedCount(imageState);

  let dragSrcIndex = null;

  for (let i = 0; i < total; i++) {
    const img = getImageAt(i, imageState);
    const div = document.createElement("div");
    div.className = "thumb";
    if (i === imageState.currentIndex) div.classList.add("active");
    div.style.position = "relative";

    const isEditable = mode === "edit" || mode === "create";

    if (isEditable) {
      div.classList.add("edit-mode");
      div.draggable = true;
      div.dataset.index = i;

      div.addEventListener("dragstart", (e) => {
        dragSrcIndex = parseInt(e.currentTarget.dataset.index);
        e.dataTransfer.effectAllowed = "move";
        div.classList.add("dragging");
      });

      div.addEventListener("dragend", () => div.classList.remove("dragging"));

      div.addEventListener("dragover", (e) => {
        e.preventDefault();
        e.dataTransfer.dropEffect = "move";
        div.classList.add("drag-over");
      });

      div.addEventListener("dragleave", () => div.classList.remove("drag-over"));

      div.addEventListener("drop", (e) => {
        e.preventDefault();
        div.classList.remove("drag-over");

        const dropIndex = parseInt(e.currentTarget.dataset.index);
        if (dropIndex === dragSrcIndex) return;

        reorderImages(dragSrcIndex, dropIndex, imageState);

        renderAllImages(imageState, imageElements, mode);
      });

      const dragHandle = document.createElement("div");
      dragHandle.className = "drag-handle";
      dragHandle.innerHTML = `<i class="bi bi-arrows-move"></i>`;
      dragHandle.style.position = "absolute";
      dragHandle.style.top = "5px";
      dragHandle.style.left = "5px";
      div.appendChild(dragHandle);
    }

    const im = document.createElement("img");
    im.src = img.src;
    im.style.width = "100%";
    im.style.height = "100%";
    im.style.objectFit = "cover";
    div.appendChild(im);

    if (isEditable) {
      const delBtn = document.createElement("button");
      delBtn.type = "button";
      delBtn.className = "del-btn btn btn-sm btn-outline-danger";
      delBtn.innerHTML = `<i class="bi bi-trash"></i>`;
      delBtn.style.position = "absolute";
      delBtn.style.bottom = "5px";
      delBtn.style.right = "5px";
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

        renderAllImages(imageState, imageElements, mode);
      });
    }

    div.addEventListener("click", (e) => {
      if (e.target.closest(".del-btn")) return;
      imageState.currentIndex = i;
      renderAllImages(imageState, imageElements, mode);
    });

    imageElements.thumbnailsEl.appendChild(div);
  }
}

// MAIN FIX: always allow reordering within the same group (existing OR new)
function reorderImages(fromIndex, toIndex, imageState) {
  const existingLen = imageState.existingImages.length;
  const fromExisting = fromIndex < existingLen;
  const toExisting = toIndex < existingLen;

  // Only allow reordering inside the same group
  if (fromExisting !== toExisting) return;

  if (fromExisting) {
    // Reorder existing images (edit mode)
    const item = imageState.existingImages.splice(fromIndex, 1)[0];
    imageState.existingImages.splice(toIndex, 0, item);
  } else {
    // Reorder new images (create mode — this was previously blocked)
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