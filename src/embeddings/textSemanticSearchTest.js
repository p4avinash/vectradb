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

  const query = "What is React used for?"

  console.log("\nSearch query:")
  console.log(query)

  const results = await textVectorStore.search(query, 3)

  console.log("\nSearch results:\n")

  results.forEach((result, index) => {
    console.log(`${index + 1}. ${result.id}`)

    console.log(`   Score: ${result.score}`)

    console.log(`   Technology: ${result.metadata.technology}`)

    console.log(`   Text: ${result.metadata.text}`)

    console.log()
  })
}

main().catch((error) => {
  console.error("Semantic search test failed:")

  console.error(error)
})
