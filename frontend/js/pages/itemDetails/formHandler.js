// formHandler.js
import {
  createItem,
  updateItem,
  deleteItem,
} from "../../api/itemsApi.js";
import * as helpers from "./helpers.js";
import { validateLocation } from "./locationHandler.js"; // ← NEW: validate state/city/address

export async function handleSubmit(e, mode, itemId, imageState) {
  e.preventDefault();

  // Validate location fields before proceeding
  if (!validateLocation()) {
    return; // validation already shows alert
  }

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
      helpers.showAlert("success", "Item criado com sucesso!");
      setTimeout(() => window.location.href = "myItems.html", 1200);
    } 

    else if (mode === "edit" && itemId) {
      const image_order = imageState.existingImages.map(img => img.id);

      const payload = {
        ...data,
        deleteImageIds: Array.from(imageState.deleteImageIds),
        new_image_order: JSON.stringify(image_order), // backend expects this key
      };

      await updateItem(itemId, payload);
      helpers.showAlert("success", "Item atualizado com sucesso!");
      setTimeout(() => window.location.href = "myItems.html", 1200);
    }
  } catch (err) {
    console.error(err);
    const msg = err.message?.includes("state") || err.message?.includes("city") || err.message?.includes("address")
      ? "Verifique os campos de localização."
      : err.message || "Erro ao salvar item.";
    helpers.showAlert("danger", `Erro: ${msg}`);
  }
}

export async function handleDelete(itemId) {
  if (!confirm("Tem certeza que deseja excluir este item?")) return;

  try {
    await deleteItem(itemId);
    helpers.showAlert("success", "Item excluído com sucesso!");
    setTimeout(() => window.location.href = "myItems.html", 1200);
  } catch (err) {
    helpers.showAlert("danger", `Erro: ${err.message || "Erro ao excluir item."}`);
  }
}