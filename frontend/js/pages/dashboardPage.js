// js/pages/dashboardPage.js
import { getCurrentUser } from "../api/authApi.js";
import { getMyOffers } from "../api/offersApi.js";
import { loadNavbar } from "../components/navbar.js";
import { renderOfferCard, initOfferCardEvents } from "../components/offerCard.js";

document.addEventListener("DOMContentLoaded", async () => {
  await loadNavbar();

  const userInfo = document.getElementById("userInfo");
  const dashboardData = document.getElementById("dashboardData");
  const myOffersContainer = document.getElementById("myOffersContainer");

  let user = null;

  try {
    user = await getCurrentUser();

    // If no valid user (not logged in or invalid session)
    if (!user?.username) {
      showNotLoggedInState();
      return;
    }

    // SUCCESS: User is authenticated
    showDashboard(user);

  } catch (err) {
    // Any error (401, network, expired token, etc.) → treat as not logged in
    console.warn("Authentication failed or session expired:", err);
    showNotLoggedInState();
  }

  // ——————————————————————————————————————
  // Show full dashboard for logged-in user
  // ——————————————————————————————————————
  function showDashboard(currentUser) {
    // Welcome section
    userInfo.innerHTML = `
      <div class="text-center py-5">
        <div class="bg-primary text-white rounded-circle d-inline-flex align-items-center justify-content-center mb-4" style="width:100px;height:100px;">
          <i class="bi bi-person fs-1"></i>
        </div>
        <h3 class="mb-2">Olá, <strong>${currentUser.username}</strong>!</h3>
        <p class="text-muted fs-5">${currentUser.email}</p>
        <p class="text-muted">Bem-vindo de volta ao seu painel</p>
      </div>
    `;

    dashboardData.style.display = "block";
    loadMyOffers(currentUser);
  }

  // ——————————————————————————————————————
  // Show friendly "not logged in" screen
  // ——————————————————————————————————————
  function showNotLoggedInState() {
    document.body.innerHTML = `
      <div id="navbarContainer"></div>
      <div class="container my-5">
        <div class="text-center py-5">
          <div class="bg-light rounded-4 p-5 shadow-sm" style="max-width: 500px; margin: 0 auto;">
            <i class="bi bi-shield-lock fs-1 text-muted mb-4"></i>
            <h3 class="mb-3">Você não está conectado</h3>
            <p class="text-muted mb-4">Faça login ou crie uma conta para acessar seu painel.</p>
            <div class="d-flex gap-3 justify-content-center flex-wrap">
              <a href="login.html" class="btn btn-primary px-5">Entrar</a>
              <a href="register.html" class="btn btn-outline-primary px-5">Criar conta</a>
            </div>
          </div>
        </div>
      </div>
    `;

    // Re-inject navbar after replacing body
    loadNavbar();
  }

  // ——————————————————————————————————————
  // Load user's active offers
  // ——————————————————————————————————————
  async function loadMyOffers(currentUser) {
    myOffersContainer.innerHTML = `
      <div class="text-center py-4">
        <div class="spinner-border text-warning" role="status"></div>
        <p class="mt-3 text-muted">Carregando propostas...</p>
      </div>
    `;

    try {
      const response = await getMyOffers();
      const offers = response?.data || response || [];

      if (offers.length === 0) {
        myOffersContainer.innerHTML = `
          <div class="text-center py-5">
            <i class="bi bi-inbox fs-1 text-muted mb-3"></i>
            <p class="text-muted">Você ainda não fez nenhuma proposta.</p>
            <a href="../marketplace.html" class="btn btn-primary mt-3">Explorar Anúncios</a>
          </div>
        `;
        return;
      }

      myOffersContainer.innerHTML = `<div class="row row-cols-1 row-cols-md-2 g-4" id="offersGrid"></div>`;
      const grid = myOffersContainer.querySelector("#offersGrid");

      for (const entry of offers) {
        const offer = entry.offer;
        const item = entry.item;

        grid.insertAdjacentHTML("beforeend", renderOfferCard(offer, item, currentUser, "offer-maker-view"));
        const card = grid.lastElementChild.querySelector(".offer-card");
        card._offerData = offer;
      }

      initOfferCardEvents(grid);

    } catch (err) {
      console.error("Failed to load offers:", err);
      myOffersContainer.innerHTML = `
        <div class="text-center py-5 text-danger">
          <i class="bi bi-exclamation-triangle fs-1"></i>
          <p>Erro ao carregar propostas.</p>
        </div>
      `;
    }
  }
});