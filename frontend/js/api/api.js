import { showErrorModal } from "../components/resultModals.js";

const VERBOSE = false;
export const API_BASE_URL = "http://localhost:5887/api"; // adjust if needed

function v(...args) {
  if (VERBOSE) console.log("[API DEBUG]", ...args);
}


// -------------------------------
// Centralized error handling (PT-BR UI)
// -------------------------------
function handleCommonApiErrors(err) {
  v("🔍 [handleCommonApiErrors] START");
  v("   → Raw error object:", err);

  const msg = err?.message || "Unknown error";
  v("   → Extracted message:", msg);
  v("   → Checking error type...");

  // -------------------------------
  // 400 Bad Request
  // -------------------------------
  if (msg.startsWith("400")) {
    v("   → Matched 400 Bad Request");

    if (msg.includes("Offer is not pending confirmation")) {
      showErrorModal({
        title: "Oferta não está pendente de confirmação",
        message: "A oferta selecionada não está em estado de pendência."
      });
      return;
    }

    if (msg.includes("Offer is not active and thus cant be cancelled")) {
      showErrorModal({
        title: "Não é possível cancelar a oferta",
        message: "Apenas ofertas ativas podem ser canceladas."
      });
      return;
    }

    if (msg.includes("Item is not available for offers")) {
      showErrorModal({
        title: "Item indisponível",
        message: "Este item não está aceitando novas ofertas no momento."
      });
      return;
    }

    if (msg.includes("already made an offer")) {
      showErrorModal({
        title: "Oferta duplicada",
        message: "Você já fez uma oferta ativa para este item."
      });
      return;
    }

    if (msg.includes("Invalid duration")) {
      showErrorModal({
        title: "Duração inválida",
        message: "A duração deve ser uma das seguintes: 1, 7, 15 ou 30 dias."
      });
      return;
    }

    let specific = "";
    if (msg.includes("Missing required fields")) {
      specific = "Por favor, preencha todos os campos obrigatórios antes de continuar.";
    }

    showErrorModal({
      title: "Entrada inválida",
      message: specific || "Algumas informações fornecidas não são válidas."
    });

    return;
  }

  // -------------------------------
  // 401 Unauthorized
  // -------------------------------
  else if (msg.startsWith("401")) {
    v("   → Matched 401 Unauthorized");

    if (msg.includes("Invalid credentials")) {
      showErrorModal({
        title: "Login inválido",
        message: "O nome de usuário ou senha está incorreto."
      });
    } else {
      showErrorModal({
        title: "Não autenticado",
        message: "Você precisa estar logado para continuar.",
        actionText: "Ir para Login",
        actionHref: "/login.html"
      });
    }

    v("   → Error modal displayed for 401");
    return;
  }

  // -------------------------------
  // 403 Forbidden
  // -------------------------------
  else if (msg.startsWith("403")) {
    v("   → Matched 403 Forbidden");

    if (msg.includes("You are not part of this negotiation")) {
      showErrorModal({
        title: "Acesso negado",
        message: "Você não faz parte desta negociação."
      });
      return;
    }

    if (msg.includes("You cannot make offers on your own item")) {
      showErrorModal({
        title: "Ação não permitida",
        message: "Você não pode fazer ofertas nos seus próprios itens."
      });
      return;
    }

    if (msg.includes("You can only cancel your own offers")) {
      showErrorModal({
        title: "Ação não permitida",
        message: "Você só pode cancelar suas próprias ofertas."
      });
      return;
    }

    showErrorModal({
      title: "Acesso não autorizado",
      message: "Você não tem permissão para realizar esta ação."
    });

    v("   → Error modal displayed for 403");
    return;
  }

  // -------------------------------
  // 404 Not Found
  // -------------------------------
  else if (msg.startsWith("404")) {
    v("   → Matched 404 Not Found");

    if (msg.includes("Offer not found")) {
      showErrorModal({
        title: "Oferta não encontrada",
        message: "A oferta que você está tentando acessar não existe ou foi removida."
      });
    } else if (msg.includes("item not found")) {
      showErrorModal({
        title: "Item não encontrado",
        message: "O item que você está tentando acessar não existe ou foi removido."
      });
    } else {
      showErrorModal({
        title: "Não encontrado",
        message: "O recurso solicitado não existe."
      });
    }

    return;
  }

  // -------------------------------
  // 409 Conflict
  // -------------------------------
  else if (msg.startsWith("409")) {
    v("   → Matched 409 Conflict");

    if (msg.includes("Offer cannot be edited")) {
      showErrorModal({
        title: "Oferta não pode ser editada",
        message: "A oferta que você está tentando modificar não pode ser alterada."
      });
      return;
    }

    if (msg.includes("Item no longer accepts negotiation")) {
      showErrorModal({
        title: "Item não aceita mais negociações",
        message: "O item não está mais aceitando negociações."
      });
      return;
    }

    let specific = "";
    if (msg.includes("Username or email already taken")) {
      specific = "Este nome de usuário ou email já está em uso. Tente outro.";
    }

    showErrorModal({
      title: "Conflito de conta",
      message: specific || "Ocorreu um conflito com os dados fornecidos."
    });

    return;
  }

  // -------------------------------
  // 415 Unsupported Media Type
  // -------------------------------
  else if (msg.startsWith("415")) {
    showErrorModal({
      title: "Imagem inválida",
      message: "O arquivo selecionado não é um formato de imagem suportado."
    });
    return;
  }

  // -------------------------------
  // 500 Internal Server Error
  // -------------------------------
  else if (msg.startsWith("500")) {
    v("   → Matched 500 Server Error");

    showErrorModal({
      title: "Erro no servidor",
      message: "O servidor encontrou um problema. Tente novamente mais tarde."
    });

    v("   → Error modal displayed for 500");
    return;
  }

  // -------------------------------
  // Network / TypeError
  // -------------------------------
  else if (msg.startsWith("TypeError")) {
    v("   → Matched TypeError (likely fetch/network issue)");

    showErrorModal({
      title: "Erro de conexão",
      message: "Falha na conexão. Verifique sua internet ou o status do servidor."
    });

    v("   → Error modal displayed for network failure");
    return;
  }

  // -------------------------------
  // Fallback
  // -------------------------------
  v("   → No known type matched. Using fallback handler.");
  showErrorModal({
    title: "Erro",
    message: msg
  });

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
