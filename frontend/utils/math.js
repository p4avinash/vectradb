/**
 * VectraDB Explorer - Vector Math Utilities
 */

/**
 * Compute the dot product of two vectors
 */
export function dotProduct(a, b) {
  if (!a || !b || a.length !== b.length) {
    throw new Error("Vectors must have matching non-zero lengths")
  }
  let dot = 0
  for (let i = 0; i < a.length; i++) {
    dot += a[i] * b[i]
  }
  return dot
}

/**
 * Compute L2 Euclidean norm (magnitude) of a vector
 */
export function norm(a) {
  let sum = 0
  for (let i = 0; i < a.length; i++) {
    sum += a[i] * a[i]
  }
  return Math.sqrt(sum)
}

/**
 * Compute Cosine Similarity between two vectors:
 * S_C = (A · B) / (||A|| * ||B||)
 */
export function cosineSimilarity(a, b) {
  if (!a || !b || a.length === 0 || b.length === 0 || a.length !== b.length) {
    return 0
  }
  const normA = norm(a)
  const normB = norm(b)
  if (normA === 0 || normB === 0) return 0
  const dot = dotProduct(a, b)
  return Math.max(-1, Math.min(1, dot / (normA * normB)))
}

/**
 * Compute Cosine Distance between two vectors:
 * D_C = 1 - CosineSimilarity(A, B)
 */
export function cosineDistance(a, b) {
  return 1 - cosineSimilarity(a, b)
}

/**
 * Compute geometric angle in degrees from cosine similarity:
 * theta = arccos(CosineSimilarity) * (180 / PI)
 */
export function cosineAngleDegrees(similarity) {
  const clamped = Math.max(-1, Math.min(1, similarity))
  return (Math.acos(clamped) * 180) / Math.PI
}
