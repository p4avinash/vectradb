const EmbeddingModel = require("./EmbeddingModel")

async function main() {
  const embeddingModel = new EmbeddingModel()

  console.log("Generating first embedding...")

  const vector1 = await embeddingModel.embed("React is a JavaScript library")

  console.log("Vector 1 dimension:", vector1.length)

  console.log("\nGenerating second embedding...")

  const vector2 = await embeddingModel.embed("MongoDB is a NoSQL database")

  console.log("Vector 2 dimension:", vector2.length)

  console.log("\nGenerating query embedding...")

  const queryVector = await embeddingModel.embedQuery("What is React?")

  console.log("Query vector dimension:", queryVector.length)

  console.log("\nFirst 5 values of query vector:")
  console.log(queryVector.slice(0, 5))
}

main().catch((error) => {
  console.error("Embedding model test failed:")
  console.error(error)
})
