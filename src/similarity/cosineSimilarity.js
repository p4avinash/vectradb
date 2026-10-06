function cosineSimilarity(a, b) {
  if (!Array.isArray(a) || !Array.isArray(b)) {
    throw new TypeError("Both inputs must be arrays")
  }

  if (a.length === 0 || b.length === 0) {
    throw new Error("Vectors cannot be empty")
  }

  if (a.length !== b.length) {
    throw new Error("Vectors must have the same dimensions")
  }

  let dotProduct = 0
  let magnitudeA = 0
  let magnitudeB = 0

  for (let i = 0; i < a.length; i++) {
    dotProduct += a[i] * b[i]

    magnitudeA += a[i] * a[i]
    magnitudeB += b[i] * b[i]
  }

  magnitudeA = Math.sqrt(magnitudeA)
  magnitudeB = Math.sqrt(magnitudeB)

  if (magnitudeA === 0 || magnitudeB === 0) {
    throw new Error("Cosine similarity is undefined for zero vectors")
  }

  return dotProduct / (magnitudeA * magnitudeB)
}

module.exports = cosineSimilarity
