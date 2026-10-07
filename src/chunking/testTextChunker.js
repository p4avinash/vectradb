const TextChunker = require("./TextChunker")

function main() {
  const text = "ABCDEFGHIJKLMNOPQRSTUVWXYZ"

  const chunker = new TextChunker({
    chunkSize: 10,
    overlap: 2,
  })

  const chunks = chunker.chunk(text)

  console.log("Original text:")
  console.log(text)

  console.log("\nChunk size:")
  console.log(chunker.chunkSize)

  console.log("\nOverlap:")
  console.log(chunker.overlap)

  console.log("\nChunks:\n")

  chunks.forEach((chunk) => {
    console.log(`Chunk ${chunk.index}: ${chunk.text}`)
  })
}

try {
  main()
} catch (error) {
  console.error("Chunking test failed:")

  console.error(error)
}
