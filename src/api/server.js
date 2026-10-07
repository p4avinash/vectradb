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
 * CORS middleware
 */
app.use((req, res, next) => {
  res.header("Access-Control-Allow-Origin", "*")
  res.header("Access-Control-Allow-Methods", "GET, POST, PUT, DELETE, OPTIONS")
  res.header("Access-Control-Allow-Headers", "Origin, X-Requested-With, Content-Type, Accept, Authorization")
  if (req.method === "OPTIONS") {
    return res.sendStatus(200)
  }
  next()
})

/*
 * Serve static frontend
 */
app.use(express.static(path.join(__dirname, "../../frontend")))

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
 * System Overview & Stats
 */

app.get("/stats", (req, res) => {
  const records = Array.from(vectorStore.vectors.values())
  const uniqueDocs = new Set(
    records.map((r) => r.metadata?.documentId).filter(Boolean),
  )

  res.json({
    success: true,
    data: {
      totalVectors: vectorStore.vectors.size,
      dimension: vectorStore.dimension || 384,
      totalDocuments: uniqueDocs.size,
      hnswNodes: hnswIndex.size,
      hnswMaxLevel: hnswIndex.maxLevel,
      hnswEntryPoint: hnswIndex.entryPoint,
      hnswM: hnswIndex.M,
      hnswEfConstruction: hnswIndex.efConstruction,
      hnswEfSearch: hnswIndex.efSearch,
      embeddingModel: "Xenova/multilingual-e5-small",
      storage: "JSON Persistence (data/vectors.json)",
      vectorStorageFile: "data/vectors.json",
      hnswStorageFile: "data/hnsw.json",
    },
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
        chunks: result.chunks || [],
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

    // 1. Generate query embedding for 2D visualization
    let queryVector = null
    try {
      queryVector = await ragRetriever.embeddingModel.embedQuery(question)
    } catch (e) {
      console.warn("Could not generate query vector directly:", e.message)
    }

    // 2. Execute RAG pipeline with graceful LLM fallback
    let ragResult
    let llmError = null
    try {
      ragResult = await ragPipeline.ask(question, topK)
    } catch (err) {
      llmError = err.message
      const retrieved = await ragRetriever.retrieve(question, topK)
      const context = ragContextBuilder.build(retrieved)
      ragResult = {
        answer: `⚠️ LLM generation unavailable (${llmError}). Context was retrieved successfully.`,
        results: retrieved,
        context,
      }
    }

    const filteredResults = (ragResult.results || []).filter(
      (item) => item.score >= threshold,
    )

    const enrichedResults = (ragResult.results || []).map((item) => {
      const record = vectorStore.get(item.id)
      return {
        id: item.id,
        score: item.score,
        cosineDistance: 1 - item.score,
        passedThreshold: item.score >= threshold,
        text: record?.metadata?.text || item.text || "",
        metadata: record ? record.metadata : item.metadata || {},
        vector: record ? record.vector : null,
      }
    })

    res.json({
      success: true,
      data: {
        question,
        queryVector,
        answer: ragResult.answer,
        context: ragResult.context || "",
        results: enrichedResults,
        sources: filteredResults.map((item) => ({
          id: item.id,
          score: item.score,
          source: item.metadata?.source || "",
          chunk: item.metadata?.chunkIndex ?? 0,
        })),
      },
    })
  } catch (error) {
    next(error)
  }
})

/*
 * Direct Embedding endpoint (for similarity testing / explorer)
 */

app.post("/embed", async (req, res, next) => {
  try {
    const { text, isQuery = false } = req.body

    if (typeof text !== "string" || text.trim() === "") {
      return res.status(400).json({
        success: false,
        message: "text must be a non-empty string",
      })
    }

    const vector = isQuery
      ? await ragRetriever.embeddingModel.embedQuery(text)
      : await ragRetriever.embeddingModel.embed(text)

    res.json({
      success: true,
      data: {
        text,
        vector,
        dimension: vector.length,
      },
    })
  } catch (error) {
    next(error)
  }
})

/*
 * List all stored vectors
 */

app.get("/vectors", (req, res) => {
  const records = Array.from(vectorStore.vectors.values())
  res.json({
    success: true,
    data: records,
  })
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
          cosineDistance: 1 - result.score,
          vector: record ? record.vector : null,
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
 * HNSW Graph structure endpoint
 */

app.get("/hnsw", (req, res) => {
  const nodes = []

  for (const node of hnswIndex.nodes.values()) {
    const neighbors = {}

    for (const [level, neighborIds] of node.neighbors) {
      neighbors[level] = Array.from(neighborIds)
    }

    const record = vectorStore.get(node.id)

    nodes.push({
      id: node.id,
      level: node.level,
      neighbors,
      metadata: record ? record.metadata : {},
      dimension: node.vector ? node.vector.length : hnswIndex.dimension,
    })
  }

  res.json({
    success: true,
    data: {
      entryPoint: hnswIndex.entryPoint,
      maxLevel: hnswIndex.maxLevel,
      dimension: hnswIndex.dimension,
      M: hnswIndex.M,
      efConstruction: hnswIndex.efConstruction,
      efSearch: hnswIndex.efSearch,
      size: hnswIndex.size,
      nodes,
    },
  })
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
