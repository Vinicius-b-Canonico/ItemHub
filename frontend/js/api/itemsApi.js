import { apiRequest, apiFormRequest, apiGet } from "./api.js";

// ======================================================
// 🔧 Verbose Logging Control
// ======================================================
const VERBOSE = true;

function v(...args) {
  if (VERBOSE) console.log("[ITEMS API DEBUG]", ...args);
}

// ======================================================
// POST /api/items/ - Create Item
// ======================================================
export async function createItem(
  title,
  category,
  duration_days,
  description = "",
  offer_type = "free",
  volume = null,
  location = "",
  image = null
) {
  v("createItem() called with:", {
    title,
    category,
    duration_days,
    description,
    offer_type,
    volume,
    location,
    image,
  });

  const formData = new FormData();
  formData.append("title", title);
  formData.append("category", category);
  formData.append("duration_days", duration_days);
  if (description) formData.append("description", description);
  if (offer_type) formData.append("offer_type", offer_type);
  if (volume !== null) formData.append("volume", volume);
  if (location) formData.append("location", location);
  if (image) formData.append("image", image);

  v("createItem() final FormData content:", formData);

  return apiFormRequest("/items/", "POST", formData);
}

// ======================================================
// GET /api/items/ - List Items (Paginated)
// ======================================================
export async function listItems({
  category = "",
  owner_id = null,
  status = "ativo",
  page = 1,
  page_size = 20
} = {}) {

  v("listItems() called with:", { category, owner_id, status, page, page_size });

  const params = {};

  if (category) params.category = category;
  if (owner_id !== null) params.owner_id = owner_id;
  if (status) params.status = status;

  // Pagination params (always include)
  params.page = page;
  params.page_size = page_size;

  v("Final GET parameters:", params);

  return apiGet("/items/", params);
}


// ======================================================
// GET /api/items/<id> - Get Item
// ======================================================
export async function getItem(item_id) {
  v("getItem() called with:", item_id);

  return apiGet(`/items/${item_id}`);
}


// ======================================================
// PUT /api/items/<id> - Update Item
// ======================================================
export async function updateItem(
  item_id,
  {
    title,
    description,
    category,
    offer_type,
    volume,
    location,
    duration_days,
    image = null,
  } = {}
) {
  v("updateItem() called with:", {
    item_id,
    title,
    description,
    category,
    offer_type,
    volume,
    location,
    duration_days,
    image,
  });

  // If updating image, use FormData
  if (image) {
    v("updateItem(): using FormData because image was provided");

    const formData = new FormData();
    if (title) formData.append("title", title);
    if (description) formData.append("description", description);
    if (category) formData.append("category", category);
    if (offer_type) formData.append("offer_type", offer_type);
    if (volume !== undefined && volume !== null) formData.append("volume", volume);
    if (location) formData.append("location", location);
    if (duration_days) formData.append("duration_days", duration_days);
    formData.append("image", image);

    v("updateItem() FormData:", formData);

    return apiFormRequest(`/items/${item_id}`, "PUT", formData);
  }

  // Otherwise, send JSON
  v("updateItem(): sending JSON body instead of FormData");

  const body = {};
  if (title) body.title = title;
  if (description) body.description = description;
  if (category) body.category = category;
  if (offer_type) body.offer_type = offer_type;
  if (volume !== undefined && volume !== null) body.volume = volume;
  if (location) body.location = location;
  if (duration_days) body.duration_days = duration_days;

  v("Final JSON body:", body);

  return apiRequest(`/items/${item_id}`,  true, {
    method: "PUT",
    body,
  });
}

// ======================================================
// DELETE /api/items/<id> - Delete Item
// ======================================================
export async function deleteItem(item_id) {
  v("deleteItem() called with:", item_id);

  return apiRequest(`/items/${item_id}`, true, { method: "DELETE" });
}

// ======================================================
// GET /api/items/categories - Category List
// ======================================================
export async function getItemCategories() {
  v("getItemCategories() called");

  try {
    const data = await apiGet("/items/categories");
    v("Raw categories response:", data);

    if (!data || !Array.isArray(data.categories)) {
      v("Invalid categories format detected:", data);
      throw new Error("Invalid response format for categories");
    }

    v("Returning categories:", data.categories);
    return data.categories;
  } catch (err) {
    console.error("Error fetching item categories:", err);
    throw new Error("Failed to fetch item categories");
  }
}

