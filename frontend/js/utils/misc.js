import { API_BASE_URL } from "../api/api.js";
export function normalizeImageUrl(imageUrl) {
    // If already an absolute URL, leave it as is
    if (imageUrl.startsWith("http://") || imageUrl.startsWith("https://")) {
      return imageUrl;
    }

    //need to remove the /api part before adding the base url prefix.
    if (imageUrl.startsWith("/api/items/image/")) {
      const cleaned = imageUrl.replace(/^\/api/, "");
      return `${API_BASE_URL}${cleaned}`;
    }

    // If it’s already using the backend route, return as-is with base url prefix.
    if ( imageUrl.startsWith("/items/image/")) {
      return `${API_BASE_URL}${imageUrl}`;
    }
    // Otherwise, assume it’s a filename and prepend the full image route
    return `${API_BASE_URL}/items/image/${imageUrl}`;
  }


// utils/formatDateTimeForUi.js

/**
 * Returns a user-friendly date string.
 *
 * precise = false → "3 hours ago"
 * precise = true  → "17 Nov 2025, 13:25"
 *
 * @param {string|Date} dateInput - ISO string or Date.
 * @param {boolean} precise - If true, uses full formatted date/time.
 */
export function formatDateTimeForUi(dateInput, precise = false) {
  if (!dateInput) return "";

  const date = dateInput instanceof Date ? dateInput : new Date(dateInput);
  if (isNaN(date.getTime())) return "";

  // -------------------------
  // PRECISE MODE
  // -------------------------
  if (precise) {
    return date.toLocaleString(undefined, {
      year: "numeric",
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit"
    });
  }

  // -------------------------
  // TIME AGO MODE
  // -------------------------
  const now = new Date();
  const diffSec = Math.floor((now - date) / 1000);

  if (diffSec < 60) return "just now";
  if (diffSec < 3600) return `${Math.floor(diffSec / 60)} minutes ago`;
  if (diffSec < 86400) return `${Math.floor(diffSec / 3600)} hours ago`;
  if (diffSec < 86400 * 7) return `${Math.floor(diffSec / 86400)} days ago`;

  // Fallback to local date
  return date.toLocaleDateString(undefined, {
    year: "numeric",
    month: "short",
    day: "numeric"
  });
}
