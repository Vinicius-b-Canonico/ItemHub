import { loginUser, getCurrentUser } from "../api/authApi.js";

document.addEventListener("DOMContentLoaded", () => {
  const form = document.querySelector("#loginForm");
  const alertContainer = document.querySelector("#alertContainer");

  // Redirect if already logged in
  checkExistingSession();

  form.addEventListener("submit", async (e) => {
    e.preventDefault();

    const username = form.username.value.trim();
    const password = form.password.value.trim();

    if (!username || !password) {
      showAlert("Please fill all fields.", "warning");
      return;
    }

    try {
      await loginUser(username, password);
      showAlert("✅ Login successful! Redirecting...", "success");

      setTimeout(() => {
        window.location.href = "dashboard.html";
      }, 1200);
    } catch (err) {
      showAlert(`❌ ${err.message}`, "danger");
    }
  });

  async function checkExistingSession() {
    try {
      const user = await getCurrentUser();
      if (user && user.username) {
        window.location.href = "dashboard.html";
      }
    } catch (e) {
      // Not logged in, continue
    }
  }

  function showAlert(message, type) {
    alertContainer.innerHTML = `
      <div class="alert alert-${type} alert-dismissible fade show" role="alert">
        ${message}
        <button type="button" class="btn-close" data-bs-dismiss="alert"></button>
      </div>`;
  }
});
