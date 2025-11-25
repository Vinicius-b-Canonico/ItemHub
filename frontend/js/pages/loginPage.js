import { loginUser, getCurrentUser } from "../api/authApi.js";
import { loadNavbar } from "../components/navbar.js";
import { showSuccessModal } from "../components/resultModals.js"; // ← NEW import

document.addEventListener("DOMContentLoaded", async () => {
  await loadNavbar();

  const form = document.getElementById("loginForm");

  await checkExistingSession();

  form.addEventListener("submit", async (e) => {
    e.preventDefault();

    const username = form.username.value.trim();
    const password = form.password.value.trim();

    if (!username || !password) return; // API will handle error modal

    try {
      await loginUser(username, password);
      showSuccessModal({ message: "Login realizado com sucesso! Redirecionando..." });

      setTimeout(() => {
        window.location.href = "dashboard.html";
      }, 1200);
    } catch {} // API handles error modal
  });

  async function checkExistingSession() {
    try {
      const user = await getCurrentUser();
      if (user?.username) {
        window.location.href = "dashboard.html";
      }
    } catch {}
  }
});