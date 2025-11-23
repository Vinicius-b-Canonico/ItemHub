import { apiRequest } from "./api.js";

/**
 * Register a new user
 * Backend: POST /api/auth/register
 */
export async function registerUser(username, email, password) {
  return apiRequest("/auth/register", true, {
    method: "POST",
    body: { username, email, password },
  });
}

/**
 * Login user
 * Backend: POST /api/auth/login
 */
export async function loginUser(username, password) {
  return apiRequest("/auth/login", true, {
    method: "POST",
    body: { username, password },
  });
}

/**
 * Get logged-in user info
 * Backend: GET /api/auth/me
 */
export async function getCurrentUser() {
  return apiRequest("/auth/me", false);
}

/**
 * Logout current user (clears JWT cookie)
 * Backend: POST /api/auth/logout
 */
export async function logoutUser() {
  return apiRequest("/auth/logout",true, { method: "POST" });
}
