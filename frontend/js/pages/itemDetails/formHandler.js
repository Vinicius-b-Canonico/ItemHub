// formHandler.js
import { createItem, updateItem, deleteItem } from "../../api/itemsApi.js";
import * as helpers from "./helpers.js";
import { validateLocation } from "./locationHandler.js";
import { showSuccessModal } from "../../components/resultModals.js";

export async function handleSubmit(e, mode, itemId, imageState) {
  e.preventDefault();

  if (!validateLocation()) return;

  const data = helpers.collectFormData();

  try {
    if (mode === "create") {
      const orderedNewImages = imageState.newImages.slice();
      const mainImage = orderedNewImages.length > 0 ? orderedNewImages[0] : null;
      const extraImages = orderedNewImages.length > 1 ? orderedNewImages.slice(1) : [];

      await createItem({ ...data, mainImage, extraImages });

      showSuccessModal({
        title: "Anúncio Criado!",
        message: "Seu item foi publicado com sucesso."
      });

      setTimeout(() => window.location.href = "myItems.html", 1500);
    }

    else if (mode === "edit" && itemId) {
      const image_order = imageState.existingImages.map(img => img.id);

      await updateItem(itemId, {
        ...data,
        deleteImageIds: Array.from(imageState.deleteImageIds),
        new_image_order: JSON.stringify(image_order),
      });

      showSuccessModal({
        title: "Anúncio Atualizado!",
        message: "As alterações foram salvas com sucesso."
      });

      setTimeout(() => window.location.href = "myItems.html", 1500);
    }
  } catch (err) {
    console.error(err);
    const msg = err.message || "Erro ao salvar anúncio.";
    helpers.showAlert("danger", msg);
  }
}

export async function handleDelete(itemId) {
  if (!confirm("Tem certeza que deseja excluir este anúncio permanentemente?")) return;

  try {
    await deleteItem(itemId);
    showSuccessModal({
      title: "Anúncio Excluído",
      message: "O item foi removido com sucesso."
    });
    setTimeout(() => window.location.href = "myItems.html", 1500);
  } catch (err) {
    helpers.showAlert("danger", err.message || "Erro ao excluir anúncio.");
  }
}