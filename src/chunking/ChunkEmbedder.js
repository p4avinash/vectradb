const EmbeddingModel = require("../embeddings/EmbeddingModel")

class ChunkEmbedder {
  constructor(embeddingModel = null) {
    this.embeddingModel = embeddingModel || new EmbeddingModel()
  }

  async embed(chunks) {
    if (!Array.isArray(chunks)) {
      throw new Error("Chunks must be an array")
    }

    if (chunks.length === 0) {
      throw new Error("Chunks array cannot be empty")
    }

    for (const chunk of chunks) {
      if (
        !chunk ||
        typeof chunk.text !== "string" ||
        chunk.text.trim() === ""
      ) {
        throw new Error("Every chunk must contain non-empty text")
      }
    }

    const texts = chunks.map((chunk) => chunk.text)

    const vectors = await this.embeddingModel.embedBatch(texts)

    return chunks.map((chunk, index) => ({
      ...chunk,
      vector: vectors[index],
    }))
  }
}

module.exports = ChunkEmbedder
