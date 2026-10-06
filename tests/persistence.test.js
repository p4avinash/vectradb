const path = require("path")

const VectorStore = require("../src/core/VectorStore")
const JsonStorage = require("../src/storage/JsonStorage")

const storagePath = path.join(__dirname, "../data/vectors.json")

const storage = new JsonStorage(storagePath)

console.log("========== CREATE STORE ==========")

const store = new VectorStore(storage)

console.log("Store created")
console.log()

console.log("========== INSERT ==========")

store.insert({
  id: "doc-1",
  vector: [1, 0, 0],
  metadata: {
    source: "react.md",
    topic: "React",
  },
})

store.insert({
  id: "doc-2",
  vector: [0.9, 0.1, 0],
  metadata: {
    source: "react-state.md",
    topic: "React State",
  },
})

console.log("Vectors inserted")
console.log()

console.log("========== SEARCH BEFORE RESTART ==========")

console.log(store.search([0.8, 0.2, 0], 2))

console.log()

console.log("========== CREATE NEW STORE ==========")

const newStore = new VectorStore(new JsonStorage(storagePath))

console.log("New store created")
console.log()

console.log("========== SEARCH AFTER RESTART ==========")

console.log(newStore.search([0.8, 0.2, 0], 2))
