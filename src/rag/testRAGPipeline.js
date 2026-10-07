require("dotenv").config()

const WordChunker = require("../chunking/WordChunker")

const ChunkMetadata = require("../chunking/ChunkMetadata")

const ChunkEmbedder = require("../chunking/ChunkEmbedder")

const ChunkVectorStore = require("../chunking/ChunkVectorStore")

const VectorStore = require("../core/VectorStore")

const HNSWIndex = require("../index/HNSWIndex")

const RAGRetriever = require("./RAGRetriever")

const RAGContextBuilder = require("./RAGContextBuilder")

const RAGPromptBuilder = require("./RAGPromptBuilder")

const LLMGenerator = require("./LLMGenerator")

const RAGPipeline = require("./RAGPipeline")

async function main() {
  const documents = [
    {
      id: "react-guide",
      source: "react-guide.txt",
      text: `
React is a JavaScript library for building user interfaces.
React applications are composed of reusable components.
Components can manage their own state and receive data through props.
React uses a virtual DOM to efficiently update the user interface.
`,
    },

    {
      id: "next-guide",
      source: "next-guide.txt",
      text: `
Next.js is a React framework for production web applications.
It provides routing, rendering, data fetching and server-side features.
Next.js supports multiple rendering strategies including SSR, SSG and ISR.
`,
    },

    {
      id: "mongodb-guide",
      source: "mongodb-guide.txt",
      text: `
MongoDB is a NoSQL database used to store application data.
It stores data in flexible JSON-like documents.
MongoDB supports indexes, aggregation pipelines and replication.
`,
    },
  ]

  console.log("=== Building Knowledge Base ===\n")

  const vectorStore = new VectorStore()

  const hnswIndex = new HNSWIndex({
    M: 8,
    efConstruction: 100,
    efSearch: 50,
  })

  const chunker = new WordChunker({
    chunkSize: 180,
    overlap: 40,
  })

  const chunkEmbedder = new ChunkEmbedder()

  const chunkVectorStore = new ChunkVectorStore(vectorStore, hnswIndex)

  for (const document of documents) {
    const chunks = chunker.chunk(document.text)

    const chunksWithMetadata = ChunkMetadata.attach(chunks, {
      documentId: document.id,
      source: document.source,
    })

    const embeddedChunks = await chunkEmbedder.embed(chunksWithMetadata)

    chunkVectorStore.insert(embeddedChunks)
  }

  console.log(`Knowledge base chunks: ${vectorStore.vectors.size}`)

  console.log(`HNSW vectors: ${hnswIndex.size}\n`)

  const retriever = new RAGRetriever(vectorStore, hnswIndex)

  const contextBuilder = new RAGContextBuilder()

  const promptBuilder = new RAGPromptBuilder()

  const llmGenerator = new LLMGenerator()

  const rag = new RAGPipeline({
    retriever,
    contextBuilder,
    promptBuilder,
    llmGenerator,
  })

  const question = "What is React used for?"

  console.log(`Question: ${question}\n`)

  const response = await rag.ask(question, 3)

  console.log("=== Retrieved Results ===\n")

  response.results.forEach((result, index) => {
    console.log(`${index + 1}. ${result.id} → ${result.score}`)
  })

  console.log("\n=== Final Answer ===\n")

  console.log(response.answer)
}

main().catch((error) => {
  console.error("RAG pipeline test failed:")

  console.error(error)
})
