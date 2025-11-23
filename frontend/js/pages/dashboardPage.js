import { getCurrentUser } from "../api/authApi.js";
import { getMyOffers } from "../api/offersApi.js";


import { loadNavbar } from "../components/navbar.js";
import { renderOfferCard, initOfferCardEvents } from "../components/offerCard.js";

document.addEventListener("DOMContentLoaded", async () => {
  await loadNavbar();

  const userInfo = document.querySelector("#userInfo");
  const dashboardData = document.querySelector("#dashboardData");
  const myOffersContainer = document.querySelector("#myOffersContainer");

  try {
    const user = await getCurrentUser();
    if (!user || !user.username) {
      window.location.href = "login.html";
      return;
    }

    // --- USER INFO CARD ---
    userInfo.innerHTML = `
      <div class="card shadow-sm p-4 mx-auto" style="max-width: 500px;">
        <h4 class="mb-2">Welcome, <strong>${user.username}</strong>!</h4>
        <p class="mb-1 text-muted">${user.email}</p>
      </div>
    `;

    dashboardData.style.display = "block";

    loadRecentItems();
    loadMyOffers(user);

  } catch (err) {
    console.error(err);
    window.location.href = "login.html";
  }

  // --- STATIC PLACEHOLDER ---
  function loadRecentItems() {
    document.querySelector("#recentItems").innerHTML = `
      <p class="text-muted mb-0">This section will show site activity soon.</p>
    `;
  }

  // --- LOAD USER OFFERS ---
  async function loadMyOffers(currentUser) {
    myOffersContainer.innerHTML = `
      <div class="text-center my-3">
        <div class="spinner-border text-warning" role="status"></div>
        <p class="mt-2 text-muted">Loading offers...</p>
      </div>
    `;

    try {
      const offersResponse = await getMyOffers();
      const data = offersResponse?.data || offersResponse || [];

      if (data.length === 0) {
        myOffersContainer.innerHTML = `
          <p class="text-muted">You haven’t made any offers yet.</p>
        `;
        return;
      }

      // Build the grid container
      myOffersContainer.innerHTML = `
        <div class="row row-cols-1 row-cols-md-2 g-3" id="offersGrid"></div>
      `;

      const grid = document.querySelector("#offersGrid");

      // Insert cards and attach offer object for editing
      for (const entry of data) {
        const offer = entry.offer;
        const item = entry.item;

        grid.insertAdjacentHTML(
          "beforeend",
          renderOfferCard(offer, item, currentUser, "offer-maker-view")
        );

        // store offer object for the modal
        const lastCard = grid.lastElementChild.querySelector(".offer-card");
        lastCard._offerData = offer;
      }

      // Enable card button actions
      initOfferCardEvents(grid);

    } catch (err) {
      console.error("Error loading offers:", err);
      myOffersContainer.innerHTML = `
        <p class="text-danger">Failed to load your offers.</p>
      `;
    }
  }
});
