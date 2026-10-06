const VectorStore = require("../src/core/VectorStore")
const HNSWIndex = require("../src/index/HNSWIndex")

const DIMENSION = 8
const TOTAL_VECTORS = 100
const TOTAL_QUERIES = 5
const TOP_K = 5

const M = 8
const EF_CONSTRUCTION = 100
const EF_SEARCH = 50

function randomVector(dimension) {
  return Array.from({ length: dimension }, () => Math.random())
}

function calculateRecall(groundTruth, hnswResults) {
  const groundTruthIds = new Set(groundTruth.map((result) => result.id))

  const hnswIds = new Set(hnswResults.map((result) => result.id))

  let matches = 0

  for (const id of hnswIds) {
    if (groundTruthIds.has(id)) {
      matches++
    }
  }

  return matches / groundTruth.length
}

function average(numbers) {
  if (numbers.length === 0) {
    return 0
  }

  return numbers.reduce((sum, value) => sum + value, 0) / numbers.length
}

console.log("========== HNSW BENCHMARK ==========")

console.log(`Dimension: ${DIMENSION}`)
console.log(`Vectors: ${TOTAL_VECTORS}`)
console.log(`Queries: ${TOTAL_QUERIES}`)
console.log(`Top-K: ${TOP_K}`)
console.log(`M: ${M}`)
console.log(`efConstruction: ${EF_CONSTRUCTION}`)
console.log(`efSearch: ${EF_SEARCH}`)

const vectorStore = new VectorStore()

const hnswIndex = new HNSWIndex({
  M,
  efConstruction: EF_CONSTRUCTION,
  efSearch: EF_SEARCH,
})

console.log("\n========== INSERT VECTORS ==========")

const vectors = []

for (let i = 1; i <= TOTAL_VECTORS; i++) {
  const vector = randomVector(DIMENSION)

  const id = `doc-${i}`

  vectors.push({
    id,
    vector,
  })

  vectorStore.insert({
    id,
    vector,
    metadata: {
      index: i,
    },
  })

  hnswIndex.insert(id, vector)
}

console.log(`VectorStore size: ${vectorStore.vectors.size}`)

console.log(`HNSW size: ${hnswIndex.size}`)

console.log(`HNSW max level: ${hnswIndex.maxLevel}`)

console.log("\n========== RUN BENCHMARK ==========")

const recallScores = []
const bruteForceTimes = []
const hnswTimes = []

for (let queryIndex = 1; queryIndex <= TOTAL_QUERIES; queryIndex++) {
  const queryVector = randomVector(DIMENSION)

  // -----------------------------
  // BRUTE FORCE
  // -----------------------------

  const bruteForceStart = performance.now()

  const groundTruth = vectorStore.search(queryVector, TOP_K)

  const bruteForceEnd = performance.now()

  const bruteForceTime = bruteForceEnd - bruteForceStart

  // -----------------------------
  // HNSW
  // -----------------------------

  const hnswStart = performance.now()

  const hnswResults = hnswIndex.search(queryVector, TOP_K)

  const hnswEnd = performance.now()

  const hnswTime = hnswEnd - hnswStart

  // -----------------------------
  // RECALL
  // -----------------------------

  const recall = calculateRecall(groundTruth, hnswResults)

  recallScores.push(recall)
  bruteForceTimes.push(bruteForceTime)
  hnswTimes.push(hnswTime)

  console.log(`\nQuery ${queryIndex}`)

  console.log(
    "Ground Truth:",
    groundTruth.map((result) => result.id),
  )

  console.log(
    "HNSW:",
    hnswResults.map((result) => result.id),
  )

  console.log(`Brute Force Time: ${bruteForceTime.toFixed(4)} ms`)

  console.log(`HNSW Time: ${hnswTime.toFixed(4)} ms`)

  console.log(`Recall@${TOP_K}: ${(recall * 100).toFixed(2)}%`)
}

console.log("\n========== FINAL RESULTS ==========")

const averageRecall = average(recallScores)

const averageBruteForceTime = average(bruteForceTimes)

const averageHnswTime = average(hnswTimes)

console.log(`Average Recall@${TOP_K}: ${(averageRecall * 100).toFixed(2)}%`)

console.log(`Average Brute Force Time: ${averageBruteForceTime.toFixed(4)} ms`)

console.log(`Average HNSW Time: ${averageHnswTime.toFixed(4)} ms`)

if (averageBruteForceTime > averageHnswTime) {
  const speedup = averageBruteForceTime / averageHnswTime

  console.log(`Approx Speedup: ${speedup.toFixed(2)}x`)
} else {
  console.log("Approx Speedup: HNSW was not faster on this small dataset.")
}

console.log("\n========== BENCHMARK COMPLETE ==========")
