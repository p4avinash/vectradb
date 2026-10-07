const { pipeline } = require("@huggingface/transformers")
const cosineSimilarity = require("../similarity/cosineSimilarity")

async function main() {
  console.log("Loading embedding model...")

  const extractor = await pipeline(
    "feature-extraction",
    "Xenova/multilingual-e5-small",
  )

  console.log("Model loaded\n")

  const texts = [
    "React is a JavaScript library",
    "React is a frontend JavaScript library",
    "MongoDB is a NoSQL database",
  ]

  const vectors = []

  for (const text of texts) {
    const output = await extractor(text, {
      pooling: "mean",
      normalize: true,
    })

    vectors.push(Array.from(output.data))
  }

  const similarityAB = cosineSimilarity(vectors[0], vectors[1])

  const similarityAC = cosineSimilarity(vectors[0], vectors[2])

  console.log("A:", texts[0])
  console.log("B:", texts[1])
  console.log("C:", texts[2])

  console.log("\nSimilarity A ↔ B:", similarityAB)
  console.log("Similarity A ↔ C:", similarityAC)
}

main().catch((error) => {
  console.error("Similarity test failed:")
  console.error(error)
})
