const TextChunker = require("./TextChunker")

function main() {
  const document = `
React is a JavaScript library for building user interfaces.
React applications are composed of reusable components.
Components can manage their own state and receive data through props.
React uses a virtual DOM to efficiently update the user interface.

Next.js is a React framework for production web applications.
It provides routing, rendering, data fetching and server-side features.
Next.js supports multiple rendering strategies including SSR, SSG and ISR.

MongoDB is a NoSQL database used to store application data.
It stores data in flexible JSON-like documents.
MongoDB supports indexes, aggregation pipelines and replication.
`

  const chunker = new TextChunker({
    chunkSize: 180,
    overlap: 40,
  })

  const chunks = chunker.chunk(document)

  console.log("=== Real Document Chunking ===\n")

  console.log("Document length:")
  console.log(document.length)

  console.log("\nChunk size:")
  console.log(chunker.chunkSize)

  console.log("\nOverlap:")
  console.log(chunker.overlap)

  console.log("\nTotal chunks:")
  console.log(chunks.length)

  console.log("\nChunks:\n")

  chunks.forEach((chunk) => {
    console.log(`========== Chunk ${chunk.index} ==========`)

    console.log(`Length: ${chunk.text.length}`)

    console.log(chunk.text)

    console.log()
  })
}

try {
  main()
} catch (error) {
  console.error("Real document chunking test failed:")

  console.error(error)
}
