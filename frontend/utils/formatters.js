/**
 * VectraDB Explorer - Formatting Utilities
 */

/**
 * Format a floating-point number with fixed decimal places
 */
export function formatFloat(num, decimals = 4) {
  if (num === null || num === undefined || isNaN(num)) return "0.0000"
  return Number(num).toFixed(decimals)
}

/**
 * Format similarity as percentage string
 */
export function formatPercent(score) {
  if (score === null || score === undefined || isNaN(score)) return "0.0%"
  return `${(Number(score) * 100).toFixed(1)}%`
}

/**
 * Truncate long text with ellipsis
 */
export function truncateText(text, maxLength = 100) {
  if (!text) return ""
  if (text.length <= maxLength) return text
  return text.substring(0, maxLength).trim() + "..."
}

/**
 * Format first N numbers of a high-dimensional vector
 */
export function formatVectorPreview(vector, count = 6) {
  if (!Array.isArray(vector) || vector.length === 0) return "[]"
  const preview = vector.slice(0, count).map((v) => formatFloat(v, 4))
  const remaining = vector.length - count
  if (remaining > 0) {
    return `[${preview.join(", ")}, ... +${remaining} more]`
  }
  return `[${preview.join(", ")}]`
}

/**
 * Escape HTML special characters for safe DOM insertion
 */
export function escapeHtml(unsafe) {
  if (unsafe === null || unsafe === undefined) return ""
  return String(unsafe)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;")
}

/**
 * Format JSON with pretty indentation
 */
export function formatJson(obj) {
  try {
    return JSON.stringify(obj, null, 2)
  } catch {
    return String(obj)
  }
}
