const { pipeline } = require("@huggingface/transformers")

async function main() {
  console.log("Loading embedding model...")

  const extractor = await pipeline(
    "feature-extraction",
    "Xenova/multilingual-e5-small",
  )

  console.log("Model loaded")

  const text = "React is a JavaScript library"

  const output = await extractor(text, {
    pooling: "mean",
    normalize: true,
  })

  const vector = Array.from(output.data)

  console.log("Text:", text)
  console.log("Vector dimension:", vector.length)
  console.log("First 10 values:", vector.slice(0, 10))
}

main().catch((error) => {
  console.error("Embedding failed:")
  console.error(error)
})
