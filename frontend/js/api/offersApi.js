import { apiRequest, apiGet } from "./api.js";

/**
 * POST /api/offers/
 * Create a new offer (bid) on an existing item
 *
 * @param {number} item_id - The ID of the item being offered on
 * @param {number} price - Offer price (positive = pay, 0 = free, negative = get paid)
 * @param {string} [message] - Optional message for the offer
 */
export async function createOffer(item_id, price, message = "") {
  return apiRequest("/offers/", true, {
    method: "POST",
    body: { item_id, price, message },
  });
}

/**
 * GET /api/offers/<offer_id>
 * Retrieve a single offer by ID (public)
 *
 * @param {number} offer_id - Offer ID to fetch
 */
export async function getOfferById(offer_id) {
  return apiGet(`/offers/${offer_id}`);
}

/**
 * GET /api/offers/item/<item_id>
 * Retrieve all offers for a given item (public)
 *
 * @param {number} item_id - Item ID to fetch offers for
 */
export async function getOffersForItem(item_id) {
  return apiGet(`/offers/item/${item_id}`);
}

/**
 * GET /api/offers/my
 * Retrieve all offers made by the logged-in user
 */
export async function getMyOffers() {
  return apiGet(`/offers/my`);
}



// ===============================
// Offer Actions API (UPDATED)
// ===============================

/**
 * Cancel an active offer created by the logged-in user.
 */
export async function apiCancelOffer(offerId) {
  return apiRequest(`/offers/${offerId}/cancel`, true, {
    method: "PATCH"
  });
}

/**
 * Confirm participation in a pending negotiation.
 */
export async function apiConfirmOffer(offerId, action_param = "confirm") {
  return apiRequest(`/offers/${offerId}/confirm`, true, {
    method: "PATCH",
    body: { action: action_param }
  });
}

/**
 * Decline a pending negotiation offer.
 */
export async function apiDeclineOffer(offerId) {
  return apiRequest(`/offers/${offerId}/decline`, true, {
    method: "PATCH"
  });
}
/**
 * PUT /api/offers/<offer_id>
 * Edit/update an existing offer.
 *
 * @param {number} offer_id - ID of the offer to update
 * @param {number|null} [price] - New price (optional)
 * @param {string|null} [message] - Updated message (optional)
 */
export async function updateOffer(offer_id, price = null, message = null) {
  const body = {};

  if (price !== null && price !== undefined) {
    body.price = price;
  }
  if (message !== null && message !== undefined) {
    body.message = message;
  }

  return apiRequest(`/offers/${offer_id}`, true, {
    method: "PUT",
    body,
  });
}

