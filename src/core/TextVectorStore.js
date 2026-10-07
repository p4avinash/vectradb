const EmbeddingModel = require("../embeddings/EmbeddingModel")

class TextVectorStore {
  constructor(vectorStore, hnswIndex = null) {
    if (!vectorStore) {
      throw new Error("VectorStore is required")
    }

    this.vectorStore = vectorStore
    this.hnswIndex = hnswIndex
    this.embeddingModel = new EmbeddingModel()
  }

  async insert({ id, text, metadata = {} }) {
    if (!id) {
      throw new Error("Vector ID is required")
    }

    if (typeof text !== "string" || text.trim() === "") {
      throw new Error("Text must be a non-empty string")
    }

    const vector = await this.embeddingModel.embed(text)

    const record = this.vectorStore.insert({
      id,
      vector,
      metadata: {
        ...metadata,
        text,
      },
    })

    if (this.hnswIndex) {
      this.hnswIndex.insert(id, vector)
    }

    return record
  }

  async search(text, topK = 5, threshold = 0) {
    if (typeof text !== "string" || text.trim() === "") {
      throw new Error("Search text must be a non-empty string")
    }

    if (!Number.isInteger(topK) || topK <= 0) {
      throw new Error("topK must be a positive integer")
    }

    if (typeof threshold !== "number") {
      throw new Error("threshold must be a number")
    }

    const queryVector = await this.embeddingModel.embedQuery(text)

    let searchResults

    if (this.hnswIndex) {
      searchResults = this.hnswIndex.search(queryVector, topK)
    } else {
      searchResults = this.vectorStore.search(queryVector, topK, threshold)
    }

    return searchResults
      .filter((result) => result.score >= threshold)
      .map((result) => {
        const record = this.vectorStore.get(result.id)

        return {
          id: result.id,
          score: result.score,
          metadata: record ? record.metadata : {},
        }
      })
  }
}

module.exports = TextVectorStore
