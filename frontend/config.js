/**
 * VectraDB Explorer - Configuration
 */

export const CONFIG = {
  // Read from window.ENV if provided, or default to current origin / localhost:3000
  API_BASE_URL:
    (typeof window !== "undefined" && window.ENV && window.ENV.API_BASE_URL) ||
    (typeof window !== "undefined" && window.location.origin.startsWith("http")
      ? window.location.origin
      : "http://localhost:3000"),
  
  APP_NAME: "VectraDB Explorer",
  VERSION: "1.0.0",
  EMBEDDING_MODEL: "Xenova/multilingual-e5-small",
  DEFAULT_DIMENSION: 384,
  POLL_INTERVAL_MS: 15000,
  REQUEST_TIMEOUT_MS: 20000,
}
