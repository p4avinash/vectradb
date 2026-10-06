const cosineSimilarity = require("../similarity/cosineSimilarity")

class VectorStore {
  constructor(storage = null) {
    this.vectors = new Map()
    this.dimension = null
    this.storage = storage

    this.load()
  }

  insert(record) {
    const { id, vector, metadata = {} } = record

    if (!id) {
      throw new Error("Vector ID is required")
    }

    if (!Array.isArray(vector) || vector.length === 0) {
      throw new Error("Vector must be a non-empty array")
    }

    if (this.vectors.has(id)) {
      throw new Error(`Vector with ID "${id}" already exists`)
    }

    if (this.dimension === null) {
      this.dimension = vector.length
    }

    if (vector.length !== this.dimension) {
      throw new Error(`Vector dimension must be ${this.dimension}`)
    }

    const recordToStore = {
      id,
      vector,
      metadata,
    }

    this.vectors.set(id, recordToStore)

    this.save()

    return recordToStore
  }

  get(id) {
    return this.vectors.get(id) || null
  }

  update(id, updates) {
    const existing = this.vectors.get(id)

    if (!existing) {
      throw new Error(`Vector with ID "${id}" not found`)
    }

    if (updates.vector !== undefined) {
      if (!Array.isArray(updates.vector) || updates.vector.length === 0) {
        throw new Error("Vector must be a non-empty array")
      }

      if (updates.vector.length !== this.dimension) {
        throw new Error(`Vector dimension must be ${this.dimension}`)
      }
    }

    const updatedRecord = {
      ...existing,
      ...updates,
      id,
    }

    this.vectors.set(id, updatedRecord)

    this.save()

    return updatedRecord
  }

  delete(id) {
    if (!this.vectors.has(id)) {
      return false
    }

    this.vectors.delete(id)

    this.save()

    return true
  }

  search(queryVector, topK = 5, threshold = 0) {
    if (!Array.isArray(queryVector) || queryVector.length === 0) {
      throw new Error("Query vector must be a non-empty array")
    }

    if (this.dimension === null) {
      return []
    }

    if (queryVector.length !== this.dimension) {
      throw new Error(`Query vector dimension must be ${this.dimension}`)
    }

    if (topK <= 0) {
      throw new Error("topK must be greater than 0")
    }

    const results = []

    for (const record of this.vectors.values()) {
      const score = cosineSimilarity(queryVector, record.vector)

      if (score >= threshold) {
        results.push({
          id: record.id,
          score,
          metadata: record.metadata,
        })
      }
    }

    results.sort((a, b) => b.score - a.score)

    return results.slice(0, topK)
  }

  save() {
    if (!this.storage) {
      return
    }

    const data = {
      dimension: this.dimension,
      vectors: Array.from(this.vectors.values()),
    }

    this.storage.save(data)
  }

  load() {
    if (!this.storage) {
      return
    }

    const data = this.storage.load()

    if (!data) {
      return
    }

    this.dimension = data.dimension

    this.vectors = new Map(data.vectors.map((record) => [record.id, record]))
  }
}

module.exports = VectorStore
