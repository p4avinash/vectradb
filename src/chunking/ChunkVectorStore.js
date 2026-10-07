class ChunkVectorStore {
  constructor(vectorStore, hnswIndex = null) {
    if (!vectorStore) {
      throw new Error("VectorStore is required")
    }

    this.vectorStore = vectorStore
    this.hnswIndex = hnswIndex
  }

  insert(chunks) {
    if (!Array.isArray(chunks)) {
      throw new Error("Chunks must be an array")
    }

    if (chunks.length === 0) {
      throw new Error("Chunks array cannot be empty")
    }

    const insertedChunks = []

    for (const chunk of chunks) {
      if (
        !chunk ||
        typeof chunk.index !== "number" ||
        typeof chunk.text !== "string" ||
        !Array.isArray(chunk.vector)
      ) {
        throw new Error("Every chunk must contain index, text and vector")
      }

      if (!chunk.metadata || typeof chunk.metadata !== "object") {
        throw new Error("Every chunk must contain metadata")
      }

      const id = `${chunk.metadata.documentId}-chunk-${chunk.index}`

      const record = this.vectorStore.insert({
        id,
        vector: chunk.vector,
        metadata: {
          ...chunk.metadata,
          text: chunk.text,
        },
      })

      if (this.hnswIndex) {
        this.hnswIndex.insert(id, chunk.vector)
      }

      insertedChunks.push(record)
    }

    return insertedChunks
  }
}

module.exports = ChunkVectorStore
