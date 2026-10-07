const path = require("path")

const JsonStorage = require("../storage/JsonStorage")

const HNSWStorage = require("../storage/HNSWStorage")

const VectorStore = require("../core/VectorStore")

const HNSWIndex = require("../index/HNSWIndex")

const DocumentIngestion = require("./DocumentIngestion")

async function main() {
  const vectorStorage = new JsonStorage(
    path.join(__dirname, "../../data/test-final-vectors.json"),
  )

  const hnswStorage = new HNSWStorage(
    path.join(__dirname, "../../data/test-final-hnsw.json"),
  )

  const vectorStore = new VectorStore(vectorStorage)

  const hnswIndex = new HNSWIndex({
    M: 8,
    efConstruction: 100,
    efSearch: 50,
    storage: hnswStorage,
  })

  const ingestion = new DocumentIngestion({
    vectorStore,
    hnswIndex,
    chunkSize: 180,
    overlap: 40,
  })

  const documentText = `
React is a JavaScript library for building user interfaces.
React applications are composed of reusable components.
Components can manage their own state and receive data through props.
Next.js is a React framework for production web applications.
Next.js supports multiple rendering strategies including SSR, SSG and ISR.
MongoDB is a NoSQL database that stores data in flexible JSON-like documents.
`

  const result = await ingestion.ingest({
    documentId: "react-guide",
    text: documentText,
    source: "react-guide.txt",
  })

  console.log("\n=== DOCUMENT INGESTION ===\n")

  console.log("Document ID:", result.documentId)

  console.log("Source:", result.source)

  console.log("Chunk count:", result.chunkCount)

  console.log("VectorStore size:", vectorStore.vectors.size)

  console.log("HNSW size:", hnswIndex.size)

  console.log("\nFirst chunk:")

  console.log(JSON.stringify(result.chunks[0], null, 2))

  console.log("\nDocument ingestion test passed.")
}

main().catch((error) => {
  console.error("\nDocument ingestion test failed:")

  console.error(error)

  process.exit(1)
})
