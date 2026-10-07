require("dotenv").config()
const express = require("express")
const path = require("path")

const VectorStore = require("../core/VectorStore")
const JsonStorage = require("../storage/JsonStorage")
const HNSWIndex = require("../index/HNSWIndex")
const HNSWStorage = require("../storage/HNSWStorage")

const DocumentIngestion = require("../app/DocumentIngestion")

const RAGRetriever = require("../rag/RAGRetriever")

const RAGContextBuilder = require("../rag/RAGContextBuilder")

const RAGPromptBuilder = require("../rag/RAGPromptBuilder")

const LLMGenerator = require("../rag/LLMGenerator")

const RAGPipeline = require("../rag/RAGPipeline")

const errorHandler = require("./middleware/errorHandler")

const validateVector = require("./middleware/validateVector")

const validateSearch = require("./middleware/validateSearch")

const validateUpdateVector = require("./middleware/validateUpdateVector")

const validateDeleteVector = require("./middleware/validateDeleteVector")

const validateDocument = require("./middleware/validateDocument")

const validateQuery = require("./middleware/validateQuery")

const app = express()

const PORT = 3000

app.use(express.json())

/*
 * Storage
 */

const vectorStoragePath = path.join(__dirname, "../../data/vectors.json")

const hnswStoragePath = path.join(__dirname, "../../data/hnsw.json")

const vectorStorage = new JsonStorage(vectorStoragePath)

const hnswStorage = new HNSWStorage(hnswStoragePath)

/*
 * Core vector database
 */

const vectorStore = new VectorStore(vectorStorage)

const hnswIndex = new HNSWIndex({
  M: 8,
  efConstruction: 100,
  efSearch: 50,
  storage: hnswStorage,
})

/*
 * Rebuild HNSW from VectorStore if needed.
 *
 * This handles the case where vectors.json
 * contains vectors but hnsw.json is empty.
 */

if (hnswIndex.size === 0 && vectorStore.vectors.size > 0) {
  for (const record of vectorStore.vectors.values()) {
    hnswIndex.insert(record.id, record.vector)
  }
}

/*
 * Document ingestion
 */

const documentIngestion = new DocumentIngestion({
  vectorStore,
  hnswIndex,
})

/*
 * RAG pipeline
 */

const ragRetriever = new RAGRetriever(vectorStore, hnswIndex)

const ragContextBuilder = new RAGContextBuilder()

const ragPromptBuilder = new RAGPromptBuilder()

const llmGenerator = new LLMGenerator()

const ragPipeline = new RAGPipeline({
  retriever: ragRetriever,
  contextBuilder: ragContextBuilder,
  promptBuilder: ragPromptBuilder,
  llmGenerator,
})

/*
 * Health check
 */

app.get("/health", (req, res) => {
  res.json({
    success: true,
    message: "VectraDB API is running",
  })
})

/*
 * Document ingestion
 */

app.post("/documents", validateDocument, async (req, res, next) => {
  try {
    const { documentId, text, source } = req.body

    const result = await documentIngestion.ingest({
      documentId,
      text,
      source,
    })

    res.status(201).json({
      success: true,

      data: {
        documentId: result.documentId,

        source: result.source,

        chunkCount: result.chunkCount,
      },
    })
  } catch (error) {
    next(error)
  }
})

/*
 * RAG query
 */

app.post("/query", validateQuery, async (req, res, next) => {
  try {
    const { question, topK = 5, threshold = 0 } = req.body

    const result = await ragPipeline.ask(question, topK)

    const filteredResults = result.results.filter(
      (item) => item.score >= threshold,
    )

    res.json({
      success: true,

      data: {
        question,

        answer: result.answer,

        sources: filteredResults.map((item) => ({
          id: item.id,

          score: item.score,

          source: item.metadata.source,

          chunk: item.metadata.chunkIndex,
        })),
      },
    })
  } catch (error) {
    next(error)
  }
})

/*
 * Insert raw vector
 */

app.post("/vectors", validateVector, (req, res, next) => {
  try {
    const { id, vector, metadata } = req.body

    const record = vectorStore.insert({
      id,
      vector,
      metadata,
    })

    hnswIndex.insert(id, vector)

    res.status(201).json({
      success: true,
      data: record,
    })
  } catch (error) {
    next(error)
  }
})

/*
 * Get vector
 */

app.get("/vectors/:id", (req, res, next) => {
  try {
    const { id } = req.params

    const record = vectorStore.get(id)

    if (!record) {
      return res.status(404).json({
        success: false,
        message: `Vector with ID "${id}" not found`,
      })
    }

    res.json({
      success: true,
      data: record,
    })
  } catch (error) {
    next(error)
  }
})

/*
 * Update vector
 */

app.put("/vectors/:id", validateUpdateVector, (req, res, next) => {
  try {
    const { id } = req.params

    const existing = vectorStore.get(id)

    if (!existing) {
      return res.status(404).json({
        success: false,
        message: `Vector with ID "${id}" not found`,
      })
    }

    const { vector, metadata } = req.body

    const updates = {}

    if (vector !== undefined) {
      updates.vector = vector
    }

    if (metadata !== undefined) {
      updates.metadata = metadata
    }

    const updatedRecord = vectorStore.update(id, updates)

    if (vector !== undefined) {
      hnswIndex.update(id, vector)
    }

    res.json({
      success: true,
      data: updatedRecord,
    })
  } catch (error) {
    next(error)
  }
})

/*
 * Delete vector
 */

app.delete("/vectors/:id", validateDeleteVector, (req, res, next) => {
  try {
    const { id } = req.params

    const deleted = vectorStore.delete(id)

    if (!deleted) {
      return res.status(404).json({
        success: false,
        message: `Vector with ID "${id}" not found`,
      })
    }

    hnswIndex.delete(id)

    res.json({
      success: true,
      message: `Vector "${id}" deleted successfully`,
    })
  } catch (error) {
    next(error)
  }
})

/*
 * Vector similarity search
 */

app.post("/vectors/search", validateSearch, (req, res, next) => {
  try {
    const { vector, topK = 5, threshold = 0 } = req.body

    const hnswResults = hnswIndex.search(vector, topK)

    const results = hnswResults
      .filter((result) => result.score >= threshold)
      .map((result) => {
        const record = vectorStore.get(result.id)

        return {
          id: result.id,

          score: result.score,

          metadata: record ? record.metadata : {},
        }
      })

    res.json({
      success: true,
      data: results,
    })
  } catch (error) {
    next(error)
  }
})

/*
 * Centralized error handler.
 *
 * Must be registered after all routes.
 */

app.use(errorHandler)

/*
 * Start server
 */

app.listen(PORT, () => {
  console.log(`VectraDB API running on http://localhost:${PORT}`)
})
