/**
 * VectraDB Explorer - Central API Client Layer
 */

import { CONFIG } from "./config.js"

class ApiClient {
  constructor() {
    this.baseUrl = CONFIG.API_BASE_URL
  }

  /**
   * Helper method for JSON requests with standard error handling
   */
  async request(endpoint, options = {}) {
    const url = `${this.baseUrl}${endpoint}`
    const headers = {
      "Content-Type": "application/json",
      Accept: "application/json",
      ...(options.headers || {}),
    }

    const controller = new AbortController()
    const timeoutId = setTimeout(() => controller.abort(), CONFIG.REQUEST_TIMEOUT_MS)

    try {
      const response = await fetch(url, {
        ...options,
        headers,
        signal: controller.signal,
      })

      clearTimeout(timeoutId)

      let result
      const contentType = response.headers.get("content-type")
      if (contentType && contentType.includes("application/json")) {
        result = await response.json()
      } else {
        result = { message: await response.text() }
      }

      if (!response.ok) {
        const errorMessage =
          result?.message || result?.error || `HTTP ${response.status}: ${response.statusText}`
        const error = new Error(errorMessage)
        error.status = response.status
        error.data = result
        throw error
      }

      return result
    } catch (err) {
      clearTimeout(timeoutId)
      if (err.name === "AbortError") {
        throw new Error(`Request to ${endpoint} timed out after ${CONFIG.REQUEST_TIMEOUT_MS}ms`)
      }
      throw err
    }
  }

  /**
   * Check backend server health
   */
  async healthCheck() {
    return this.request("/health", { method: "GET" })
  }

  /**
   * Fetch database overview statistics
   */
  async getStats() {
    return this.request("/stats", { method: "GET" })
  }

  /**
   * Ingest a raw document (chunk, embed, store, index)
   */
  async ingestDocument({ documentId, text, source }) {
    return this.request("/documents", {
      method: "POST",
      body: JSON.stringify({ documentId, text, source }),
    })
  }

  /**
   * Ask question to RAG pipeline
   */
  async queryRAG({ question, topK = 5, threshold = 0 }) {
    return this.request("/query", {
      method: "POST",
      body: JSON.stringify({ question, topK: Number(topK), threshold: Number(threshold) }),
    })
  }

  /**
   * Get all stored vector records
   */
  async getVectors() {
    return this.request("/vectors", { method: "GET" })
  }

  /**
   * Get single vector by ID
   */
  async getVector(id) {
    return this.request(`/vectors/${encodeURIComponent(id)}`, { method: "GET" })
  }

  /**
   * Insert raw vector record
   */
  async createVector({ id, vector, metadata = {} }) {
    return this.request("/vectors", {
      method: "POST",
      body: JSON.stringify({ id, vector, metadata }),
    })
  }

  /**
   * Update vector or metadata by ID
   */
  async updateVector(id, updates) {
    return this.request(`/vectors/${encodeURIComponent(id)}`, {
      method: "PUT",
      body: JSON.stringify(updates),
    })
  }

  /**
   * Delete vector by ID
   */
  async deleteVector(id) {
    return this.request(`/vectors/${encodeURIComponent(id)}`, {
      method: "DELETE",
    })
  }

  /**
   * Similarity search with raw vector array
   */
  async searchVectors({ vector, topK = 5, threshold = 0 }) {
    return this.request("/vectors/search", {
      method: "POST",
      body: JSON.stringify({ vector, topK: Number(topK), threshold: Number(threshold) }),
    })
  }

  /**
   * Retrieve HNSW graph structure
   */
  async getHNSWGraph() {
    return this.request("/hnsw", { method: "GET" })
  }

  /**
   * Embed text directly using the backend transformer model
   */
  async embedText({ text, isQuery = false }) {
    return this.request("/embed", {
      method: "POST",
      body: JSON.stringify({ text, isQuery }),
    })
  }
}

export const api = new ApiClient()
