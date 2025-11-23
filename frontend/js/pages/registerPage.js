import { registerUser } from "../api/authApi.js";

document.addEventListener("DOMContentLoaded", () => {
  const form = document.querySelector("#registerForm");
  const alertContainer = document.querySelector("#alertContainer");

  form.addEventListener("submit", async (e) => {
    e.preventDefault();

    // Gather input
    const username = form.username.value.trim();
    const email = form.email.value.trim();
    const password = form.password.value.trim();

    // Basic front validation
    if (!username || !email || !password) {
      showAlert("Please fill all fields.", "warning");
      return;
    }

    try {
      const res = await registerUser(username, email, password);
      showAlert("✅ Registration successful! Redirecting...", "success");

      // redirect after short delay
      setTimeout(() => (window.location.href = "login.html"), 1200);
    } catch (err) {
      showAlert(`❌ ${err.message}`, "danger");
    }
  });

  function showAlert(message, type) {
    alertContainer.innerHTML = `
      <div class="alert alert-${type} alert-dismissible fade show" role="alert">
        ${message}
        <button type="button" class="btn-close" data-bs-dismiss="alert"></button>
      </div>`;
  }
});
