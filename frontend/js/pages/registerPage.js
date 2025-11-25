import { registerUser } from "../api/authApi.js";
import { loadNavbar } from "../components/navbar.js";
import { showSuccessModal } from "../components/resultModals.js"; // ← NEW import

document.addEventListener("DOMContentLoaded", async () => {
  await loadNavbar();

  const form = document.getElementById("registerForm");

  form.addEventListener("submit", async (e) => {
    e.preventDefault();

    const username = form.username.value.trim();
    const email = form.email.value.trim();
    const password = form.password.value.trim();

    if (!username || !email || !password) return; // API will handle error modal

    try {
      await registerUser(username, email, password);
      showSuccessModal({ message: "Cadastro realizado com sucesso! Redirecionando..." });

      setTimeout(() => {
        window.location.href = "login.html";
      }, 1200);
    } catch {} // API handles error modal
  });
});