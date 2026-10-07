const EmbeddingModel = require("./EmbeddingModel")

async function main() {
  const embeddingModel = new EmbeddingModel()

  const texts = [
    "React is a JavaScript library",
    "Next.js is a React framework",
    "MongoDB is a NoSQL database",
    "Redis is an in-memory data store",
  ]

  console.log("Generating batch embeddings...\n")

  const vectors = await embeddingModel.embedBatch(texts)

  console.log("Total texts:", texts.length)

  console.log("Total vectors:", vectors.length)

  console.log("\nEmbedding dimension:")
  console.log(embeddingModel.dimension)

  console.log("\nVector dimensions:")

  vectors.forEach((vector, index) => {
    console.log(`${index + 1}. ${vector.length}`)
  })

  const allSameDimension = vectors.every(
    (vector) => vector.length === embeddingModel.dimension,
  )

  console.log("\nAll vectors match model dimension:", allSameDimension)
}

main().catch((error) => {
  console.error("Batch embedding test failed:")

  console.error(error)
})
