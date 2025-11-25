// helpers.js

export function fillForm(item) {
  document.getElementById("title").value = item.title || "";
  document.getElementById("category").value = item.category || "";
  document.getElementById("duration_days").value = item.duration_days || "7";
  document.getElementById("description").value = item.description || "";
  document.getElementById("offer_type").value = item.offer_type || "free";
  document.getElementById("volume").value = item.volume || "";
  // location fields are filled by locationHandler.fillLocationFields()
}

export function disableForm(form) {
  [...form.elements].forEach((el) => {
    if (el.id !== "cancel-btn") el.disabled = true;
  });
}

export function collectFormData() {
  return {
    title: document.getElementById("title").value.trim(),
    category: document.getElementById("category").value,
    duration_days: parseInt(document.getElementById("duration_days").value),
    description: document.getElementById("description").value.trim(),
    offer_type: document.getElementById("offer_type").value,
    volume: document.getElementById("volume").value || null,
    // New location fields
    state: document.getElementById("state").value.trim(),
    city: document.getElementById("city").value.trim(),
    address: document.getElementById("address").value.trim(),
  };
}

export function showAlert(type, message) {
  const alertContainer = document.getElementById("alertContainer");
  alertContainer.innerHTML = `
    <div class="alert alert-${type} alert-dismissible fade show" role="alert">
      ${message}
      <button type="button" class="btn-close" data-bs-dismiss="alert"></button>
    </div>`;
}