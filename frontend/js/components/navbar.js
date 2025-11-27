// js/components/navbar.js
import { getCurrentUser, logoutUser } from "../api/authApi.js";

export async function loadNavbar() {
  const navbar = document.createElement("nav");
  navbar.className = "navbar navbar-expand-lg navbar-light bg-white border-bottom shadow-sm";

  let user = null;
  try {
    user = await getCurrentUser();
  } catch (_) {}

  const notificationCount = 0; // placeholder

  navbar.innerHTML = `
    <div class="container-fluid">
      <!-- Brand -->
      <a class="navbar-brand d-flex align-items-center gap-2" href="/">
        <img src="/favicon.svg" alt="ItemHub Logo"
            style="height:36px; width:auto;">
        <span class="fw-bold fs-4">Item<span class="text-primary">Hub</span></span>
      </a>

      <button class="navbar-toggler" type="button" data-bs-toggle="collapse" data-bs-target="#navbarNav">
        <span class="navbar-toggler-icon"></span>
      </button>

      <div class="collapse navbar-collapse" id="navbarNav">
        <!-- Left: Main Links -->
        <ul class="navbar-nav me-auto">
          <li class="nav-item">
            <a class="nav-link fw-medium" href="/marketplace.html">Explorar</a>
          </li>

          ${user ? `
            <li class="nav-item">
              <a class="nav-link fw-medium" href="/dashboard.html">Dashboard</a>
            </li>
            <li class="nav-item">
              <a class="nav-link fw-medium" href="/myItems.html">Meus Itens</a>
            </li>
            <li class="nav-item">
              <a class="nav-link btn btn-primary text-white px-4 ms-3" href="/itemDetails.html?mode=create">
                + Anunciar
              </a>
            </li>
          ` : `
            <li class="nav-item d-none d-lg-block">
              <a class="nav-link btn btn-outline-primary px-4" href="/itemDetails.html?mode=create">
                Anunciar Grátis
              </a>
            </li>
          `}
        </ul>

        <!-- Right: User / Auth -->
        <ul class="navbar-nav align-items-center">
          ${user ? `
            <!-- Notifications -->
            <li class="nav-item dropdown me-3 position-relative">
              <a class="nav-link p-2" href="#" role="button" data-bs-toggle="dropdown">
                <i class="bi bi-bell fs-5 text-dark"></i>
                ${notificationCount > 0 ? `
                  <span class="position-absolute top-0 start-100 translate-middle badge rounded-pill bg-danger">
                    ${notificationCount}
                  </span>
                ` : ""}
              </a>
              <ul class="dropdown-menu dropdown-menu-end shadow">
                <li><h6 class="dropdown-header">Notificações</h6></li>
                <li><hr class="dropdown-divider"></li>
                <li><span class="dropdown-item text-muted small">Nenhuma notificação</span></li>
              </ul>
            </li>

            <!-- User Dropdown -->
            <li class="nav-item dropdown">
              <a class="nav-link dropdown-toggle d-flex align-items-center gap-2" href="#" role="button" data-bs-toggle="dropdown">
                <div class="bg-primary text-white rounded-circle d-flex align-items-center justify-content-center" style="width:38px;height:38px;">
                  <i class="bi bi-person"></i>
                </div>
                <span class="d-none d-md-inline fw-medium">${user.username}</span>
              </a>
              <ul class="dropdown-menu dropdown-menu-end shadow">
                <li><a class="dropdown-item" href="/profile.html"><i class="bi bi-person me-2"></i> Perfil</a></li>
                <li><a class="dropdown-item" href="/myItems.html"><i class="bi bi-box me-2"></i> Meus Itens</a></li>
                <li><hr class="dropdown-divider"></li>
                <li><button id="logoutBtn" class="dropdown-item text-danger"><i class="bi bi-box-arrow-right me-2"></i> Sair</button></li>
              </ul>
            </li>
          ` : `
            <li class="nav-item"><a class="nav-link fw-medium" href="/login.html">Entrar</a></li>
            <li class="nav-item"><a class="nav-link btn btn-primary text-white px-4 ms-2" href="/register.html">Cadastrar</a></li>
          `}
        </ul>
      </div>
    </div>
  `;

  // Insert at top
  document.body.prepend(navbar);

  // Logout handler
  const logoutBtn = navbar.querySelector("#logoutBtn");
  if (logoutBtn) {
    logoutBtn.addEventListener("click", async () => {
      try {
        await logoutUser();
        window.location.href = "/";
      } catch (err) {
        alert("Erro ao sair: " + err.message);
      }
    });
  }
}