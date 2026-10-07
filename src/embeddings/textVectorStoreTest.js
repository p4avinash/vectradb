const VectorStore = require("../core/VectorStore")
const TextVectorStore = require("../core/TextVectorStore")

async function main() {
  const vectorStore = new VectorStore()

  const textVectorStore = new TextVectorStore(vectorStore)

  const record = await textVectorStore.insert({
    id: "react-doc",
    text: "React is a JavaScript library",
    metadata: {
      category: "frontend",
      technology: "React",
    },
  })

  console.log("Inserted record:\n")
  console.log(record)

  console.log("\nVector dimension:")
  console.log(record.vector.length)

  console.log("\nStored metadata:")
  console.log(record.metadata)
}

main().catch((error) => {
  console.error("Text vector store test failed:")

  console.error(error)
})
