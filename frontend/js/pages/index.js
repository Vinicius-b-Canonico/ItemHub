// js/pages/index.js
import { loadNavbar } from "../components/navbar.js";
import { getCurrentUser } from "../api/authApi.js";
import { getRecentItems } from "../api/itemsApi.js"; // you'll add this endpoint later

document.addEventListener("DOMContentLoaded", async () => {
  await loadNavbar();

  const user = await getCurrentUser().catch(() => null);
  if (user) {
    // Optional: personalize hero
    document.querySelector('a[href="pages/myItems.html"]')?.classList.remove("d-none");
  }

  // Load featured items
  try {
    const items = await getRecentItems(6); // top 6 recent
    renderFeaturedItems(items);
  } catch (err) {
    document.getElementById("featured-items").innerHTML = `
      <div class="col-12 text-center text-danger">
        Erro ao carregar itens. <button class="btn btn-link p-0" onclick="location.reload()">Tentar novamente</button>
      </div>`;
  }
});

function renderFeaturedItems(items) {
  const container = document.getElementById("featured-items");
  if (!items || items.length === 0) {
    container.innerHTML = '<div class="col-12 text-center text-muted">Nenhum item anunciado ainda.</div>';
    return;
  }

  container.innerHTML = items.map(item => `
    <div class="col">
      <div class="card h-100 shadow-sm hover-shadow">
        ${item.images?.[0] ? 
          `<img src="${item.images[0].image_url}" class="card-img-top" style="height:200px; object-fit:cover">` :
          `<div class="bg-light d-flex align-items-center justify-content-center" style="height:200px">
            <i class="bi bi-image fs-1 text-muted"></i>
           </div>`
        }
        <div class="card-body d-flex flex-column">
          <h5 class="card-title">${item.title}</h5>
          <p class="text-muted small flex-grow-1">${item.location || 'Localização não informada'}</p>
          <div class="d-flex justify-content-between align-items-center">
            <span class="badge bg-success">${item.offer_type === 'free' ? 'Grátis' : 'Troca'}</span>
            <a href="pages/itemDetails.html?id=${item.id}" class="btn btn-outline-primary btn-sm">Ver</a>
          </div>
        </div>
      </div>
    </div>
  `).join("");
}