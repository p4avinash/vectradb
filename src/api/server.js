const express = require("express")
const path = require("path")

const VectorStore = require("../core/VectorStore")
const JsonStorage = require("../storage/JsonStorage")
const HNSWIndex = require("../index/HNSWIndex")
const HNSWStorage = require("../storage/HNSWStorage")
const errorHandler = require("./middleware/errorHandler")
const validateVector = require("./middleware/validateVector")
const validateSearch = require("./middleware/validateSearch")
const validateUpdateVector = require("./middleware/validateUpdateVector")
const validateDeleteVector = require("./middleware/validateDeleteVector")

const app = express()

const PORT = 3000

app.use(express.json())

const vectorStoragePath = path.join(__dirname, "../../data/vectors.json")

const hnswStoragePath = path.join(__dirname, "../../data/hnsw.json")

const vectorStorage = new JsonStorage(vectorStoragePath)

const hnswStorage = new HNSWStorage(hnswStoragePath)

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
 * This is useful because existing vectors may already
 * exist in vectors.json from previous API tests.
 */
if (hnswIndex.size === 0 && vectorStore.vectors.size > 0) {
  for (const record of vectorStore.vectors.values()) {
    hnswIndex.insert(record.id, record.vector)
  }
}

app.get("/health", (req, res) => {
  res.json({
    success: true,
    message: "VectraDB API is running",
  })
})

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

app.listen(PORT, () => {
  console.log(`VectraDB API running on http://localhost:${PORT}`)
})
