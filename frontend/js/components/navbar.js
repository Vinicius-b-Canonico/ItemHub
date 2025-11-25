// js/components/navbar.js
import { getCurrentUser, logoutUser } from "../api/authApi.js";

export async function loadNavbar() {
  const container = document.createElement("nav");
  container.className = "navbar navbar-expand-lg navbar-dark bg-dark";

  let user = null;
  try {
    user = await getCurrentUser();
  } catch (_) {}

  // temporary placeholder count — you can replace this later
  const notificationCount = 0;  

  container.innerHTML = `
    <div class="container-fluid">
      <a class="navbar-brand" href="/dashboard.html">ItemHub</a>

      <button class="navbar-toggler" type="button" data-bs-toggle="collapse"
              data-bs-target="#navbarNav">
        <span class="navbar-toggler-icon"></span>
      </button>

      <div class="collapse navbar-collapse" id="navbarNav">

        <!-- LEFT SIDE -->
        <ul class="navbar-nav me-auto">

          <li class="nav-item">
            <a class="nav-link" href="/marketplace.html">Marketplace</a>
          </li>

          ${user ? `
            <li class="nav-item">
              <a class="nav-link" href="/dashboard.html">Dashboard</a>
            </li>

            <li class="nav-item">
              <a class="nav-link" href="/myItems.html">My Items</a>
            </li>

            <li class="nav-item">
              <a class="nav-link" href="/itemDetails.html?mode=create">New Item</a>
            </li>
          ` : ""}

        </ul>

        <!-- RIGHT SIDE -->
        <ul class="navbar-nav">

          ${user ? `
            <!-- 🔔 Notification dropdown with counter -->
            <li class="nav-item dropdown me-2 position-relative">

              <a class="nav-link dropdown-toggle p-0" href="#" id="notifDropdown"
                 role="button" data-bs-toggle="dropdown">

                 <i class="bi bi-bell fs-5"></i>

                 ${notificationCount > 0 ? `
                   <span class="badge rounded-pill bg-danger position-absolute top-0 start-100 translate-middle">
                     ${notificationCount}
                   </span>
                 ` : ""}
              </a>

              <ul class="dropdown-menu dropdown-menu-end">
                <li class="dropdown-header text-muted small">Notifications</li>
                <li><span class="dropdown-item-text text-muted">No notifications yet</span></li>
              </ul>
            </li>

            <!-- 👤 User dropdown -->
            <li class="nav-item dropdown">
              <a class="nav-link dropdown-toggle" href="#" id="userDropdown"
                 role="button" data-bs-toggle="dropdown">
                 ${user.username}
              </a>
              <ul class="dropdown-menu dropdown-menu-end">
                <li><a class="dropdown-item" href="/profile.html">Profile</a></li>
                <li><hr class="dropdown-divider"></li>
                <li><button id="logoutBtn" class="dropdown-item text-danger">Logout</button></li>
              </ul>
            </li>
          ` : `
            <li class="nav-item"><a class="nav-link" href="/login.html">Login</a></li>
            <li class="nav-item"><a class="nav-link" href="/register.html">Register</a></li>
          `}
        </ul>
      </div>
    </div>
  `;

  document.body.prepend(container);

  // Logout handling
  const logoutBtn = container.querySelector("#logoutBtn");
  if (logoutBtn) {
    logoutBtn.addEventListener("click", async () => {
      try {
        await logoutUser();
        window.location.href = "/login.html";
      } catch (err) {
        alert("Logout failed: " + err.message);
      }
    });
  }
}
