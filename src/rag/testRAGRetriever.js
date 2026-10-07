const WordChunker = require("../chunking/WordChunker")
const ChunkMetadata = require("../chunking/ChunkMetadata")
const ChunkEmbedder = require("../chunking/ChunkEmbedder")
const ChunkVectorStore = require("../chunking/ChunkVectorStore")

const VectorStore = require("../core/VectorStore")
const HNSWIndex = require("../index/HNSWIndex")
const RAGRetriever = require("./RAGRetriever")

async function main() {
  const reactDocument = `
React is a JavaScript library for building user interfaces.
React applications are composed of reusable components.
Components can manage their own state and receive data through props.
React uses a virtual DOM to efficiently update the user interface.
`

  const nextDocument = `
Next.js is a React framework for production web applications.
It provides routing, rendering, data fetching and server-side features.
Next.js supports multiple rendering strategies including SSR, SSG and ISR.
`

  const vectorStore = new VectorStore()

  const hnswIndex = new HNSWIndex({
    M: 8,
    efConstruction: 100,
    efSearch: 50,
  })

  const chunker = new WordChunker({
    chunkSize: 180,
    overlap: 40,
  })

  const chunkEmbedder = new ChunkEmbedder()

  const chunkVectorStore = new ChunkVectorStore(vectorStore, hnswIndex)

  const documents = [
    {
      id: "react-guide",
      source: "react-guide.txt",
      text: reactDocument,
    },
    {
      id: "next-guide",
      source: "next-guide.txt",
      text: nextDocument,
    },
  ]

  for (const document of documents) {
    const chunks = chunker.chunk(document.text)

    const chunksWithMetadata = ChunkMetadata.attach(chunks, {
      documentId: document.id,
      source: document.source,
    })

    const embeddedChunks = await chunkEmbedder.embed(chunksWithMetadata)

    chunkVectorStore.insert(embeddedChunks)
  }

  const retriever = new RAGRetriever(vectorStore, hnswIndex)

  const query = "What is React used for?"

  const results = await retriever.retrieve(query, 3)

  console.log("=== RAG Retrieval ===\n")

  console.log(`Query: ${query}\n`)

  console.log(`Results: ${results.length}\n`)

  results.forEach((result, index) => {
    console.log(`========== Result ${index + 1} ==========`)

    console.log(`ID: ${result.id}`)
    console.log(`Score: ${result.score}`)
    console.log(`Document: ${result.metadata.documentId}`)
    console.log(`Source: ${result.metadata.source}`)
    console.log(`Text:`)
    console.log(result.text)

    console.log()
  })
}

main().catch((error) => {
  console.error("RAG retrieval test failed:")

  console.error(error)
})
