class ChunkMetadata {
  static attach(chunks, { documentId, source = null } = {}) {
    if (!Array.isArray(chunks)) {
      throw new Error("Chunks must be an array")
    }

    if (!documentId) {
      throw new Error("documentId is required")
    }

    return chunks.map((chunk) => ({
      ...chunk,

      metadata: {
        documentId,
        chunkIndex: chunk.index,
        source,
      },
    }))
  }
}

module.exports = ChunkMetadata
