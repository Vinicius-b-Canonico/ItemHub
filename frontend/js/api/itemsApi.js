import { apiRequest, apiFormRequest, apiGet } from "./api.js";

// ======================================================
// 🔧 Verbose Logging Control
// ======================================================
const VERBOSE = false;

function v(...args) {
  if (VERBOSE) console.log("[ITEMS API DEBUG]", ...args);
}
// ======================================================
// POST /api/items/ - Create Item
// ======================================================
export async function createItem({
  title,
  category,
  duration_days,
  description = "",
  offer_type = "free",
  volume = null,

  // NEW
  state = "",
  city = "",
  address = "",

  mainImage = null,
  extraImages = []
}) {
  v("createItem() called with:", {
    title,
    category,
    duration_days,
    description,
    offer_type,
    volume,
    state,
    city,
    address,
    mainImage,
    extraImages,
  });

  const formData = new FormData();
  formData.append("title", title);
  formData.append("category", category);
  formData.append("duration_days", duration_days);

  if (description) formData.append("description", description);
  if (offer_type) formData.append("offer_type", offer_type);
  if (volume !== null) formData.append("volume", volume);

  // NEW: location fields
  if (state) formData.append("state", state);
  if (city) formData.append("city", city);
  if (address) formData.append("address", address);

  if (mainImage) {
    formData.append("image", mainImage);
  }

  if (extraImages && Array.isArray(extraImages)) {
    extraImages.forEach((file) => formData.append("images", file));
  }

  return apiFormRequest("/items/", "POST", formData);
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

    // NEW:
    state,
    city,
    address,

    duration_days,
    mainImage = null,
    extraImages = [],
    deleteImageIds = [],
    new_image_order = []
  } = {}
) {
  v("updateItem() called with:", {
    item_id,
    title,
    description,
    category,
    offer_type,
    volume,
    state,
    city,
    address,
    duration_days,
    mainImage,
    extraImages,
    deleteImageIds,
    new_image_order,
  });

  const needsFormData =
    mainImage ||
    (extraImages && extraImages.length > 0) ||
    (deleteImageIds && deleteImageIds.length > 0) ||
    (new_image_order && new_image_order.length > 0);

  // -----------------------------------------------------
  // CASE 1 — Use FormData
  // -----------------------------------------------------
  if (needsFormData) {
    v("updateItem(): using FormData because images/reordering involved");

    const formData = new FormData();

    if (title) formData.append("title", title);
    if (description) formData.append("description", description);
    if (category) formData.append("category", category);
    if (offer_type) formData.append("offer_type", offer_type);
    if (volume !== undefined && volume !== null) formData.append("volume", volume);

    // NEW location fields
    if (state) formData.append("state", state);
    if (city) formData.append("city", city);
    if (address) formData.append("address", address);

    if (duration_days) formData.append("duration_days", duration_days);

    if (mainImage) formData.append("image", mainImage);

    if (extraImages && Array.isArray(extraImages)) {
      extraImages.forEach((file) => formData.append("images", file));
    }

    if (deleteImageIds && Array.isArray(deleteImageIds)) {
      deleteImageIds.forEach((id) => formData.append("delete_image_ids", id));
    }

    if (new_image_order) {
      formData.append("new_image_order", new_image_order);
    }

    v("updateItem() FormData:", formData);
    return apiFormRequest(`/items/${item_id}`, "PUT", formData);
  }

  // -----------------------------------------------------
  // CASE 2 — Send JSON
  // -----------------------------------------------------
  const body = {};
  if (title) body.title = title;
  if (description) body.description = description;
  if (category) body.category = category;
  if (offer_type) body.offer_type = offer_type;
  if (volume !== undefined && volume !== null) body.volume = volume;

  // NEW location fields
  if (state) body.state = state;
  if (city) body.city = city;
  if (address) body.address = address;

  if (duration_days) body.duration_days = duration_days;

  v("Final JSON body:", body);

  return apiRequest(`/items/${item_id}`, true, {
    method: "PUT",
    body,
  });
}

// ======================================================
// POST /api/items/<id>/images - Upload ONE image
// ======================================================
export async function uploadItemImage(item_id, file) {
  v("uploadItemImage() called with:", { item_id, file });

  if (!file) {
    throw new Error("No file provided to uploadItemImage()");
  }

  const formData = new FormData();
  formData.append("file", file);

  v("uploadItemImage() FormData:", formData);

  // Uses the same form-based helper used in updateItem
  return apiFormRequest(`/items/${item_id}/images`, "POST", formData);
}

// ======================================================
// GET /api/items/ - List Items (Paginated)
// Now supports multi-select states and cities
// ======================================================
export async function listItems({
  categories = [],       
  owner_id = null,
  offer_type = "",
  states = [],          
  cities = [],          
  search = "",
  status = "ativo",
  page = 1,
  page_size = 20
} = {}) {
  v("listItems() called with:", { categories, owner_id, offer_type, states, cities, search, status, page, page_size });

  const params = new URLSearchParams();

  // Pagination & basics
  params.append("page", page);
  params.append("page_size", page_size);
  if (status) params.append("status", status);
  if (search?.trim()) params.append("search", search.trim());
  if (owner_id !== null && owner_id !== undefined) {
    params.append("owner_id", owner_id);
  }
  if (offer_type) {
    params.append("offer_type", offer_type);
  }

  // === CATEGORIES: now properly handled as array ===
  const catList = Array.isArray(categories)
    ? categories.filter(Boolean)           // remove empty/falsy
    : typeof categories === "string" && categories
      ? categories.split(",").map(c => c.trim()).filter(Boolean)
      : [];

  if (catList.length > 0) {
    params.append("categories", catList.join(","));  // → categories=1,2,7
  }

  // === STATES ===
  const stateList = Array.isArray(states)
    ? states.filter(Boolean)
    : typeof states === "string" && states
      ? states.split(",").map(s => s.trim()).filter(Boolean)
      : [];

  if (stateList.length > 0) {
    params.append("states", stateList.join(","));
  }

  // === CITIES ===
  const cityList = Array.isArray(cities)
    ? cities.filter(Boolean)
    : typeof cities === "string" && cities
      ? cities.split(",").map(c => c.trim()).filter(Boolean)
      : [];

  if (cityList.length > 0) {
    params.append("cities", cityList.join(","));
  }

  v("Final URL params:", Object.fromEntries(params));

  return apiGet(`/items/?${params.toString()}`);
}


// ======================================================
// GET /api/items/<id> - Get Item
// ======================================================
export async function getItem(item_id) {
  v("getItem() called with:", item_id);

  return apiGet(`/items/${item_id}`);
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

