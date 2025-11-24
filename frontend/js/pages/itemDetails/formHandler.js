// formHandler.js
import {
  createItem,
  updateItem,
  deleteItem,
} from "../../api/itemsApi.js";
import * as helpers from "./helpers.js";

export async function handleSubmit(e, mode, itemId, imageState) {
  e.preventDefault();

  const data = helpers.collectFormData();

  try {
    if (mode === "create") {
      const orderedNewImages = imageState.newImages.slice();
      const mainImage = orderedNewImages.length > 0 ? orderedNewImages[0] : null;
      const extraImages = orderedNewImages.length > 1 ? orderedNewImages.slice(1) : [];

      const payload = {
        ...data,
        mainImage,
        extraImages,

      };

      await createItem(payload);
      helpers.showAlert("success", "✅ Item created successfully!");
      setTimeout(() => (window.location.href = "myItems.html"), 1200);
    } else if (mode === "edit" && itemId) {
      const image_order = imageState.existingImages.map(img => img.id);
      const payload = {
        ...data,
        deleteImageIds: Array.from(imageState.deleteImageIds),
        new_image_order: JSON.stringify(image_order),
      };
      await updateItem(itemId, payload);
      helpers.showAlert("success", "✅ Item updated successfully!");
      setTimeout(() => (window.location.href = "myItems.html"), 1200);
    }
  } catch (err) {
    console.error(err);
    helpers.showAlert("danger", `❌ ${err.message || "Error saving item."}`);
  }
}

export async function handleDelete(itemId) {
  if (!confirm("Are you sure you want to delete this item?")) return;
  try {
    await deleteItem(itemId);
    helpers.showAlert("success", "✅ Item deleted successfully!");
    setTimeout(() => (window.location.href = "myItems.html"), 1200);
  } catch (err) {
    helpers.showAlert("danger", `❌ ${err.message || "Error deleting item."}`);
  }
}