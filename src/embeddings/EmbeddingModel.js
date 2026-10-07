const { pipeline } = require("@huggingface/transformers")

class EmbeddingModel {
  constructor(modelName = "Xenova/multilingual-e5-small") {
    this.modelName = modelName
    this.extractor = null
    this.dimension = null
  }

  async load() {
    if (this.extractor) {
      return this.extractor
    }

    console.log(`Loading embedding model: ${this.modelName}`)

    this.extractor = await pipeline("feature-extraction", this.modelName)

    console.log("Embedding model loaded")

    return this.extractor
  }

  validateDimension(vector) {
    if (this.dimension === null) {
      this.dimension = vector.length
      return
    }

    if (vector.length !== this.dimension) {
      throw new Error(
        `Embedding dimension mismatch: expected ${this.dimension}, got ${vector.length}`,
      )
    }
  }

  async embed(text) {
    if (typeof text !== "string" || text.trim() === "") {
      throw new Error("Text must be a non-empty string")
    }

    const extractor = await this.load()

    const output = await extractor(`passage: ${text}`, {
      pooling: "mean",
      normalize: true,
    })

    const vector = Array.from(output.data)

    this.validateDimension(vector)

    return vector
  }

  async embedQuery(text) {
    if (typeof text !== "string" || text.trim() === "") {
      throw new Error("Query text must be a non-empty string")
    }

    const extractor = await this.load()

    const output = await extractor(`query: ${text}`, {
      pooling: "mean",
      normalize: true,
    })

    const vector = Array.from(output.data)

    this.validateDimension(vector)

    return vector
  }

  async embedBatch(texts) {
    if (!Array.isArray(texts)) {
      throw new Error("Texts must be an array")
    }

    if (texts.length === 0) {
      throw new Error("Texts array cannot be empty")
    }

    for (const text of texts) {
      if (typeof text !== "string" || text.trim() === "") {
        throw new Error("Every text must be a non-empty string")
      }
    }

    const vectors = []

    for (const text of texts) {
      const vector = await this.embed(text)

      vectors.push(vector)
    }

    return vectors
  }
}

module.exports = EmbeddingModel
