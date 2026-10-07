const VectorStore = require("../core/VectorStore")
const TextVectorStore = require("../core/TextVectorStore")
const HNSWIndex = require("../index/HNSWIndex")

async function main() {
  const vectorStore = new VectorStore()

  const hnswIndex = new HNSWIndex({
    M: 4,
    efConstruction: 50,
    efSearch: 20,
  })

  const textVectorStore = new TextVectorStore(vectorStore, hnswIndex)

  const documents = [
    {
      id: "react-doc",
      text: "React is a JavaScript library for building user interfaces",
      metadata: {
        technology: "React",
      },
    },
    {
      id: "next-doc",
      text: "Next.js is a React framework for production web applications",
      metadata: {
        technology: "Next.js",
      },
    },
    {
      id: "mongodb-doc",
      text: "MongoDB is a NoSQL database used to store application data",
      metadata: {
        technology: "MongoDB",
      },
    },
  ]

  console.log("Inserting documents...\n")

  for (const document of documents) {
    await textVectorStore.insert(document)

    console.log(`Inserted: ${document.id}`)
  }

  console.log("\nVectorStore size:")
  console.log(vectorStore.vectors.size)

  console.log("\nHNSW size:")
  console.log(hnswIndex.size)

  console.log("\nHNSW nodes:")

  for (const [id] of hnswIndex.nodes) {
    console.log(id)
  }

  console.log("\nText + VectorStore + HNSW integration successful")
}

main().catch((error) => {
  console.error("Text HNSW integration test failed:")

  console.error(error)
})
