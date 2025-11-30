import { showErrorModal } from "../components/resultModals.js";

const VERBOSE = false;
export const API_BASE_URL = "http://localhost:5887/api"; // adjust if needed

function v(...args) {
  if (VERBOSE) console.log("[API DEBUG]", ...args);
}


// -------------------------------
// Centralized error handling
// -------------------------------
function handleCommonApiErrors(err) {
  v("🔍 [handleCommonApiErrors] START");
  v("   → Raw error object:", err);

  const msg = err?.message || "Unknown error";
  v("   → Extracted message:", msg);
  // Log message prefix matching
  v("   → Checking error type...");

  if (msg.startsWith("400")) {
    v("   → Matched 400 Bad Request");
    if (msg.includes("Offer is not pending confirmation")) {
      showErrorModal({
        title: "Offer is not pending confirmation",
        message: "Offer is not pending confirmation"
      });
      return;
    }


    if (msg.includes("Offer is not active and thus cant be cancelled")) {
      showErrorModal({
        title: "Cannot Cancel Offer",
        message: "Only active offers can be cancelled."
      });
      return;
    }

    if (msg.includes("Item is not available for offers")) {
      showErrorModal({
        title: "Item Unavailable",
        message: "This item is not currently open for new offers."
      });
      return;
    }

    if (msg.includes("already made an offer")) {
      showErrorModal({
        title: "Duplicate Offer",
        message: "You have already made an active offer for this item."
      });
      return;
    }


    if (msg.includes("Invalid duration")) {
      showErrorModal({
        title: "Invalid Duration",
        message: "Duration must be one of: 1, 7, 15, or 30 days."
      });
      return;
    }

    let specific = "";
    if (msg.includes("Missing required fields")) {
      specific = "Please fill out all required fields before continuing.";
    }

    showErrorModal({
      title: "Invalid Input",
      message: specific || "Some information you entered is not valid."
    });

    return;
  }
  else if (msg.startsWith("401")) {
    v("   → Matched 401 Unauthorized");
    if (msg.includes("Invalid credentials"))
    {
      showErrorModal({
      title: "Invalid Login",
      message: "The username or password you entered is incorrect.",
      });
    }
    else
    {
      showErrorModal({
        title: "Not Logged In",
        message: "You need to log in to continue.",
        actionText: "Go to Login",
        actionHref: "/login.html"
      });
    }
    
   
    v("   → Error modal displayed for 401");
    return;
  }
  else if (msg.startsWith("403")) {
    v("   → Matched 403 Forbidden");
    if (msg.includes("You are not part of this negotiation")) {
      showErrorModal({
        title: "Not Allowed",
        message: "You are not part of this negotiation"
      });
      return;
    }
    if (msg.includes("You cannot make offers on your own item")) {
      showErrorModal({
        title: "Not Allowed",
        message: "You cannot place an offer on your own item."
      });
      return;
    }
    if (msg.includes("You can only cancel your own offers")) {
      showErrorModal({
        title: "Not Allowed",
        message: "You cannot cancel offers made by other users."
      });
      return;
    }
    showErrorModal({title:"Unauthorized",message: "You don't have permission to perform this action."});
    v("   → Error modal displayed for 403");
    return;
  }
  else if (msg.startsWith("404")) {
    v("   → Matched 404 Not Found");

    if (msg.includes("Offer not found")) {
      showErrorModal({
        title: "Offer Not Found",
        message: "The offer you are trying to access does not exist or may have been removed."
      });
    }
    else if (msg.includes("item not found")) {
      showErrorModal({
        title: "Item Not Found",
        message: "The item you are trying to access does not exist or may have been removed."
      });
    } else {
      showErrorModal({
        title: "Not Found",
        message: "The requested resource does not exist."
      });
    }

    return;
  }
  else if (msg.startsWith("409")) {
    v("   → Matched 409 Conflict");

    if (msg.includes("Offer cannot be edited")) {
      showErrorModal({
        title: "Offer cannot be edited",
        message: "The offer you are trying to access cannot be edited"
      });
      return;
    }
    if (msg.includes("Item no longer accepts negotiation")) {
      showErrorModal({
        title: "Item no longer accepts negotiation",
        message: "The Item you are trying to access no longer accepts negotiation"
      });
      return;
    }
    let specific = "";
    
    if (msg.includes("Username or email already taken")) {
      specific = "This username or email is already in use. Try another.";
    }

    showErrorModal({
      title: "Account Conflict",
      message: specific || "A conflict occurred with the data you entered."
    });

    return;
  }
  else if (msg.startsWith("415")) {
    showErrorModal({
      title: "Invalid Image",
      message: "The selected file is not a supported image type."
    });
    return;
  }
  else if (msg.startsWith("500")) {
    v("   → Matched 500 Server Error");
    showErrorModal({title: "Server Error",message: "The server encountered a problem. Try again later."});
    v("   → Error modal displayed for 500");
    return;
  }
  else if (msg.startsWith("TypeError")) {
    v("   → Matched TypeError (likely fetch/network issue)");
    showErrorModal({title: "Network Error",message: "Connection failed. Check your internet or server status."});
    v("   → Error modal displayed for network failure");
    return;
  }

  // fallback
  v("   → No known type matched. Using fallback handler.");
  showErrorModal({title: "Error", message: msg});
  v("   → Fallback error modal displayed.");

  v("🔍 [handleCommonApiErrors] END");
}

// -------------------------------
// In-memory cache
// -------------------------------
const apiCache = new Map(); // key -> { timestamp, data }

/**
 * Build a cache key.
 * method: GET/POST/PUT/etc
 * url: full URL (including query string)
 * body: object or undefined - only used if cacheMatchBody === true
 */
function makeCacheKey(method, url, body, cacheMatchBody = false) {
  if (cacheMatchBody && body !== undefined && body !== null) {
    try {
      return `${method}:${url}:${JSON.stringify(body)}`;
    } catch (err) {
      // if body isn't serializable, fall back to method:url
      v("makeCacheKey: failed to stringify body, falling back", err);
      return `${method}:${url}`;
    }
  }
  return `${method}:${url}`;
}

/**
 * Try reading from cache. Returns cached data or null.
 */
function readCache(key, cacheTTL) {
  const entry = apiCache.get(key);
  if (!entry) {
    v("Cache miss (no entry) for key:", key);
    return null;
  }
  const age = Date.now() - entry.timestamp;
  if (typeof cacheTTL === "number" && cacheTTL >= 0) {
    if (age < cacheTTL) {
      v(`Cache hit (valid). key=${key} age=${age}ms < TTL=${cacheTTL}ms`);
      return entry.data;
    } else {
      v(`Cache stale. key=${key} age=${age}ms >= TTL=${cacheTTL}ms — deleting entry`);
      apiCache.delete(key);
      return null;
    }
  }
  // If cacheTTL is not provided (undefined/null), treat as always valid
  v(`Cache hit (no TTL provided). key=${key} age=${age}ms`);
  return entry.data;
}

/**
 * Save to cache
 */
function saveCache(key, data) {
  try {
    apiCache.set(key, {
      timestamp: Date.now(),
      data,
    });
    v("Saved response to cache for key:", key);
  } catch (err) {
    v("Failed to save to cache for key:", key, err);
  }
}

/**
 * Generic JSON-based request
 *
 * options accepted previously are still supported. Additional cache-related options:
 * - useCache: boolean (override; default: GET -> true, others -> false)
 * - cacheTTL: number (milliseconds). If omitted, cached entries are considered always valid.
 * - cacheMatchBody: boolean (include JSON body in cache key)
 * - forceRefresh: boolean (skip cache read; but will update cache after successful fetch if useCache is true)
 */
export async function apiRequest(endpoint, raiseErrorModal = true, options = {}) {
  v("apiRequest() called", { endpoint, raiseErrorModal, options });

  // Extract and remove caching-specific flags from options so they don't leak into fetch config
  const {
    useCache: optUseCache,
    cacheTTL = undefined,
    cacheMatchBody = false,
    forceRefresh = false,
    ...fetchOptions
  } = options || {};

  const method = (fetchOptions.method || "GET").toUpperCase();

  // Default cache behavior: GET => true, others => false
  const useCache = typeof optUseCache === "boolean" ? optUseCache : method === "GET";

  const config = {
    method,
    headers: {
      "Content-Type": "application/json",
      ...(fetchOptions.headers || {}),
    },
    credentials: "include",
  };

  v("Request config generated:", config);

  if (fetchOptions.body) {
    v("Request body provided:", fetchOptions.body);
    // keep original object for cache matching, but send stringified body to fetch
    config.body = JSON.stringify(fetchOptions.body);
  }

  const fullUrl = `${API_BASE_URL}${endpoint}`;
  v("Final request URL:", fullUrl);

  // Cache key respects cacheMatchBody only if requested
  const cacheKey = makeCacheKey(method, fullUrl, fetchOptions.body, cacheMatchBody);

  if (useCache && !forceRefresh) {
    const cached = readCache(cacheKey, cacheTTL);
    if (cached !== null) {
      v("Returning cached data for apiRequest()", { cacheKey });
      return cached;
    }
  } else if (useCache && forceRefresh) {
    v("Force refresh requested; skipping cache read for key:", cacheKey);
  } else {
    v("Cache disabled for this request (useCache=false) or method not cachable by default:", method);
  }

  let response;
  try {
    v("Calling fetch...");
    response = await fetch(fullUrl, config);
    v("Fetch completed:", response);
  } catch (err) {
    v("Fetch FAILED:", err);
    if (raiseErrorModal) handleCommonApiErrors(err);
    throw err;
  }

  let data;
  try {
    v("Parsing JSON response...");
    data = await response.json();
    v("Parsed JSON:", data);
  } catch (err) {
    v("Failed to parse JSON, returning {} instead");
    data = {};
  }

  //avoids caching error responses
  if (!response.ok) {
    const message = data?.msg || data?.error || "Request failed";
    const err = new Error(`${response.status}: ${message}`);
    v("Response not OK:", response.status, message);
    if (raiseErrorModal) handleCommonApiErrors(err);
    throw err;
  }

  // Save to cache if allowed
  if (useCache) {
    try {
      saveCache(cacheKey, data);
    } catch (err) {
      v("Warning: failed to save successful response to cache", err);
    }
  }

  v("apiRequest() returning data:", data);
  return data;
}

/**
 * Generic FormData-based request (for uploads)
 *
 * New optional last parameter: options (cache flags). By default, caching is disabled for FormData.
 * Signature: apiFormRequest(endpoint, method, formData, options = {})
 */
export async function apiFormRequest(endpoint, method, formData, options = {}) {
  v("apiFormRequest() called", { endpoint, method, formData, options });

  const {
    useCache: optUseCache,
    cacheTTL = undefined,
    forceRefresh = false,
    // cacheMatchBody ignored for FormData
    ...fetchOptions
  } = options || {};

  const fullUrl = `${API_BASE_URL}${endpoint}`;
  v("Final request URL:", fullUrl);

  // FormData bodies are not reliably serializable, so don't match body in cache keys.
  const methodUpper = (method || "POST").toUpperCase();
  const useCache = typeof optUseCache === "boolean" ? optUseCache : false; // default false

  const cacheKey = makeCacheKey(methodUpper, fullUrl, undefined, false);

  if (useCache && !forceRefresh) {
    const cached = readCache(cacheKey, cacheTTL);
    if (cached !== null) {
      v("Returning cached data for apiFormRequest()", { cacheKey });
      return cached;
    }
  } else if (useCache && forceRefresh) {
    v("Force refresh requested; skipping cache read for key:", cacheKey);
  } else {
    v("Cache disabled for FormData request (useCache=false by default)");
  }

  let response;
  try {
    v("Calling fetch with FormData...");
    response = await fetch(fullUrl, {
      method,
      body: formData,
      credentials: "include",
      ...fetchOptions,
    });
    v("Fetch completed:", response);
  } catch (err) {
    v("Fetch FAILED:", err);
    handleCommonApiErrors(err);
    throw err;
  }

  let data;
  try {
    v("Parsing JSON response...");
    data = await response.json();
    v("Parsed JSON:", data);
  } catch (err) {
    v("Failed to parse JSON, returning {} instead");
    data = {};
  }


  if (!response.ok) {
    const message = data?.msg || data?.error || "Request failed";
    const err = new Error(`${response.status}: ${message}`);
    v("Response not OK:", response.status, message);
    handleCommonApiErrors(err);
    throw err;
  }

  if (useCache) {
    saveCache(cacheKey, data);
  }

  v("apiFormRequest() returning data:", data);
  return data;
}

/**
 * Helper for GET requests with query parameters
 *
 * New optional third param `options` for cache flags (backwards compatible).
 * apiGet(endpoint, params = {}, options = {})
 */
export async function apiGet(endpoint, params = {}, options = {}) {
  v("apiGet() called", { endpoint, params, options });

  const query = new URLSearchParams(params).toString();
  const url = `${API_BASE_URL}${endpoint}${query ? "?" + query : ""}`;

  v("Final GET URL:", url);

  // default fetch options for GET
  const {
    useCache: optUseCache,
    cacheTTL = undefined,
    cacheMatchBody = false, // irrelevant for GET (no body), but accept it
    forceRefresh = false,
    ...fetchOptions
  } = options || {};

  // For GET default useCache true unless explicitly disabled
  const useCache = typeof optUseCache === "boolean" ? optUseCache : true;

  const cacheKey = makeCacheKey("GET", url, undefined, cacheMatchBody);

  if (useCache && !forceRefresh) {
    const cached = readCache(cacheKey, cacheTTL);
    if (cached !== null) {
      v("Returning cached data for apiGet()", { cacheKey });
      return cached;
    }
  } else if (useCache && forceRefresh) {
    v("Force refresh requested; skipping cache read for key:", cacheKey);
  } else {
    v("Cache disabled for this GET request (useCache=false)");
  }

  let response;
  try {
    v("Calling fetch...");
    response = await fetch(url, {
      method: "GET",
      credentials: "include",
      ...fetchOptions,
    });
    v("Fetch completed:", response);
  } catch (err) {
    v("Fetch FAILED:", err);
    handleCommonApiErrors(err);
    throw err;
  }

  let data;
  try {
    v("Parsing JSON response...");
    data = await response.json();
    v("Parsed JSON:", data);
  } catch (err) {
    v("Failed to parse JSON, returning {}");
    data = {};
  }

  if (!response.ok) {
    const message = data?.msg || data?.error || "Request failed";
    const err = new Error(`${response.status}: ${message}`);
    v("Response not OK:", response.status, message);
    handleCommonApiErrors(err);
    throw err;
  }

  if (useCache) {
    saveCache(cacheKey, data);
  }

  v("apiGet() returning data:", data);
  return data;
}

//export { API_BASE_URL, apiRequest, apiFormRequest, apiGet, VERBOSE };
