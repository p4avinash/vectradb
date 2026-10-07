const WordChunker = require("./WordChunker")
const ChunkMetadata = require("./ChunkMetadata")

function main() {
  const document = `
React is a JavaScript library for building user interfaces.
React applications are composed of reusable components.
Components can manage their own state and receive data through props.
React uses a virtual DOM to efficiently update the user interface.
`

  const chunker = new WordChunker({
    chunkSize: 100,
    overlap: 20,
  })

  const chunks = chunker.chunk(document)

  const chunksWithMetadata = ChunkMetadata.attach(chunks, {
    documentId: "react-guide",
    source: "react-guide.txt",
  })

  console.log("=== Chunk Metadata ===\n")

  console.log(`Total chunks: ${chunksWithMetadata.length}\n`)

  chunksWithMetadata.forEach((chunk) => {
    console.log(`========== Chunk ${chunk.index} ==========`)

    console.log("Text:")
    console.log(chunk.text)

    console.log("\nMetadata:")
    console.log(chunk.metadata)

    console.log()
  })
}

try {
  main()
} catch (error) {
  console.error("Chunk metadata test failed:")
  console.error(error)
}
