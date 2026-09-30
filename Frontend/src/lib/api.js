const API_URL = (
  import.meta.env.VITE_API_URL || "https://api.prod.kavyaconsultancy.com/api"
).replace(/\/+$/, "");
const AUTH_EVENT = "prodtrack:unauthorized";

const getToken = () =>
  localStorage.getItem("prodtrackToken") ||
  sessionStorage.getItem("prodtrackToken");

const clearAuthStorage = () => {
  localStorage.removeItem("prodtrackToken");
  localStorage.removeItem("prodtrackUser");
  localStorage.removeItem("prodtrackSessionTimeout");
  sessionStorage.removeItem("prodtrackToken");
  sessionStorage.removeItem("prodtrackUser");
  sessionStorage.removeItem("prodtrackSessionTimeout");
};

const readResponseBody = async (response) => {
  const contentType = response.headers.get("content-type") || "";

  if (contentType.includes("application/json")) {
    return response.json().catch(() => ({}));
  }

  const text = await response.text().catch(() => "");
  return { raw: text };
};

const statusHint = (status) => {
  if (status === 502) {
    return "Bad gateway — CWP reverse proxy cannot reach the Node app. Check the Node.js Selector / Passenger app and the proxy port.";
  }

  if (status === 503) {
    return "Backend is not running (HTTP 503). In CWP: start the Node app, confirm Passenger/startup file is backend/index.js, and read backend/logs/app-error.log.";
  }

  if (status === 504) {
    return "Gateway timeout — the Node app did not answer in time. Check CWP Node logs and MySQL.";
  }

  return "";
};

const buildErrorMessage = (response, data) => {
  if (data?.error?.hint) {
    return `${data.message || "Request failed"} (${data.error.code}: ${data.error.hint})`;
  }

  if (data?.message) {
    return data.message;
  }

  const hint = statusHint(response.status);
  if (hint) {
    return hint;
  }

  if (data?.raw && /service unavailable/i.test(data.raw)) {
    return statusHint(503);
  }

  return `API request failed (HTTP ${response.status})`;
};

export const apiRequest = async (endpoint, options = {}) => {
  const token = getToken();
  const isFormData = options.body instanceof FormData;
  const { timeoutMs: timeoutOverride, signal, headers, ...fetchOptions } = options;
  const controller = new AbortController();
  const timeoutMs = Number(timeoutOverride || 30000);
  const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

  const requestedMethod = String(fetchOptions.method || "GET").toUpperCase();
  const proxyBlockedMethods = new Set(["PUT", "PATCH", "DELETE"]);
  const sendAsPost = proxyBlockedMethods.has(requestedMethod);

  let response;

  try {
    response = await fetch(`${API_URL}${endpoint}`, {
      ...fetchOptions,
      method: sendAsPost ? "POST" : requestedMethod,
      signal: signal || controller.signal,
      headers: {
        ...(!isFormData ? { "Content-Type": "application/json" } : {}),
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
        ...(sendAsPost ? { "X-HTTP-Method-Override": requestedMethod } : {}),
        ...headers,
      },
    });
  } catch (error) {
    if (error?.name === "AbortError") {
      throw new Error(
        `API request timed out after ${timeoutMs / 1000}s. The CWP Node app may be down or overloaded.`
      );
    }

    throw new Error(
      `Cannot reach API at ${API_URL}. Check VITE_API_URL, HTTPS/CORS, and that the Node app is running.`
    );
  } finally {
    clearTimeout(timeoutId);
  }

  const data = await readResponseBody(response);

  if (!response.ok) {
    if (response.status === 401 && token) {
      clearAuthStorage();
      window.dispatchEvent(new Event(AUTH_EVENT));
    }

    throw new Error(buildErrorMessage(response, data));
  }

  return data;
};

export const apiDownload = async (endpoint) => {
  const token = getToken();
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 30000);

  let response;

  try {
    response = await fetch(`${API_URL}${endpoint}`, {
      signal: controller.signal,
      headers: token ? { Authorization: `Bearer ${token}` } : {},
    });
  } catch (error) {
    if (error?.name === "AbortError") {
      throw new Error("File download timed out. Please try again.");
    }

    throw new Error(
      `Cannot reach API at ${API_URL}. Check that the Node app is running.`
    );
  } finally {
    clearTimeout(timeoutId);
  }

  if (!response.ok) {
    if (response.status === 401 && token) {
      clearAuthStorage();
      window.dispatchEvent(new Event(AUTH_EVENT));
    }

    const data = await readResponseBody(response);
    throw new Error(buildErrorMessage(response, data) || "Failed to download file");
  }

  return response.blob();
};

export { API_URL, AUTH_EVENT };

export default apiRequest;
