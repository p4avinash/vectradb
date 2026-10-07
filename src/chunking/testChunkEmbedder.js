const WordChunker = require("./WordChunker")
const ChunkMetadata = require("./ChunkMetadata")
const ChunkEmbedder = require("./ChunkEmbedder")

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

  console.log("=== Chunk → Embedding ===\n")

  console.log(`Total chunks: ${embeddedChunks.length}\n`)

  embeddedChunks.forEach((chunk) => {
    console.log(`========== Chunk ${chunk.index} ==========`)

    console.log(`Text: ${chunk.text.slice(0, 80)}...`)

    console.log(`Document ID: ${chunk.metadata.documentId}`)

    console.log(`Source: ${chunk.metadata.source}`)

    console.log(`Vector dimension: ${chunk.vector.length}`)

    console.log(`First 5 values:`, chunk.vector.slice(0, 5))

    console.log()
  })
}

main().catch((error) => {
  console.error("Chunk embedding test failed:")
  console.error(error)
})
