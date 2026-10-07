const WordChunker = require("./WordChunker")
const ChunkMetadata = require("./ChunkMetadata")
const ChunkEmbedder = require("./ChunkEmbedder")
const ChunkVectorStore = require("./ChunkVectorStore")

const VectorStore = require("../core/VectorStore")
const HNSWIndex = require("../index/HNSWIndex")

async function main() {
  const document = `
React is a JavaScript library for building user interfaces.
React applications are composed of reusable components.
Components can manage their own state and receive data through props.
React uses a virtual DOM to efficiently update the user interface.

Next.js is a React framework for production web applications.
It provides routing, rendering, data fetching and server-side features.
`

  const chunker = new WordChunker({
    chunkSize: 180,
    overlap: 40,
  })

  const chunks = chunker.chunk(document)

  const chunksWithMetadata = ChunkMetadata.attach(chunks, {
    documentId: "react-guide",
    source: "react-guide.txt",
  })

  const chunkEmbedder = new ChunkEmbedder()

  const embeddedChunks = await chunkEmbedder.embed(chunksWithMetadata)

  const vectorStore = new VectorStore()

  const hnswIndex = new HNSWIndex({
    M: 8,
    efConstruction: 100,
    efSearch: 50,
  })

  const chunkVectorStore = new ChunkVectorStore(vectorStore, hnswIndex)

  const insertedChunks = chunkVectorStore.insert(embeddedChunks)

  console.log("=== Chunk → VectorStore ===\n")

  console.log(`Inserted chunks: ${insertedChunks.length}\n`)

  insertedChunks.forEach((record) => {
    console.log(`========== ${record.id} ==========`)

    console.log(`Vector dimension: ${record.vector.length}`)

    console.log(`Document ID: ${record.metadata.documentId}`)

    console.log(`Chunk index: ${record.metadata.chunkIndex}`)

    console.log(`Source: ${record.metadata.source}`)

    console.log(`Text: ${record.metadata.text.slice(0, 80)}...`)

    console.log()
  })

  console.log(`VectorStore size: ${vectorStore.vectors.size}`)

  console.log(`HNSW size: ${hnswIndex.size}`)
}

main().catch((error) => {
  console.error("Chunk vector store test failed:")

  console.error(error)
})
