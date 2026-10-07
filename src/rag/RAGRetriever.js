const EmbeddingModel = require("../embeddings/EmbeddingModel")

class RAGRetriever {
  constructor(vectorStore, hnswIndex) {
    if (!vectorStore) {
      throw new Error("VectorStore is required")
    }

    if (!hnswIndex) {
      throw new Error("HNSWIndex is required")
    }

    this.vectorStore = vectorStore
    this.hnswIndex = hnswIndex
    this.embeddingModel = new EmbeddingModel()
  }

  async retrieve(query, topK = 5) {
    if (typeof query !== "string" || query.trim() === "") {
      throw new Error("Query must be a non-empty string")
    }

    if (!Number.isInteger(topK) || topK <= 0) {
      throw new Error("topK must be a positive integer")
    }

    const queryVector = await this.embeddingModel.embedQuery(query)

    const searchResults = this.hnswIndex.search(queryVector, topK)

    return searchResults.map((result) => {
      const record = this.vectorStore.get(result.id)

      return {
        id: result.id,
        score: result.score,
        text: record ? record.metadata.text : "",
        metadata: record ? record.metadata : {},
      }
    })
  }
}

module.exports = RAGRetriever
