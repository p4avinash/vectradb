const RAGContextBuilder = require("./RAGContextBuilder")

function main() {
  const results = [
    {
      id: "react-guide-chunk-0",
      score: 0.9137,
      text: "React is a JavaScript library for building user interfaces.",
      metadata: {
        documentId: "react-guide",
        chunkIndex: 0,
        source: "react-guide.txt",
      },
    },
    {
      id: "react-guide-chunk-1",
      score: 0.8922,
      text: "React applications are composed of reusable components.",
      metadata: {
        documentId: "react-guide",
        chunkIndex: 1,
        source: "react-guide.txt",
      },
    },
  ]

  const contextBuilder = new RAGContextBuilder()

  const context = contextBuilder.build(results)

  console.log("=== RAG Context ===\n")

  console.log(context)
}

try {
  main()
} catch (error) {
  console.error("RAG context test failed:")

  console.error(error)
}
