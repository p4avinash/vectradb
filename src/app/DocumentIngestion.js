const WordChunker = require("../chunking/WordChunker")
const ChunkMetadata = require("../chunking/ChunkMetadata")
const ChunkEmbedder = require("../chunking/ChunkEmbedder")
const ChunkVectorStore = require("../chunking/ChunkVectorStore")

class DocumentIngestion {
  constructor({ vectorStore, hnswIndex, chunkSize = 500, overlap = 50 }) {
    if (!vectorStore) {
      throw new Error("VectorStore is required")
    }

    if (!hnswIndex) {
      throw new Error("HNSWIndex is required")
    }

    this.vectorStore = vectorStore
    this.hnswIndex = hnswIndex

    this.chunker = new WordChunker({
      chunkSize,
      overlap,
    })

    this.chunkEmbedder = new ChunkEmbedder()

    this.chunkVectorStore = new ChunkVectorStore(vectorStore, hnswIndex)
  }

  async ingest({ documentId, text, source = null }) {
    if (!documentId) {
      throw new Error("documentId is required")
    }

    if (typeof text !== "string" || text.trim() === "") {
      throw new Error("Document text must be a non-empty string")
    }

    // 1. Chunk document
    const chunks = this.chunker.chunk(text)

    // 2. Attach metadata
    const chunksWithMetadata = ChunkMetadata.attach(chunks, {
      documentId,
      source,
    })

    // 3. Generate embeddings
    const embeddedChunks = await this.chunkEmbedder.embed(chunksWithMetadata)

    // 4. Store vectors + metadata
    const insertedChunks = this.chunkVectorStore.insert(embeddedChunks)

    return {
      documentId,
      source,
      chunkCount: insertedChunks.length,
      chunks: insertedChunks,
    }
  }
}

module.exports = DocumentIngestion
