const VectorStore = require("../src/core/VectorStore")

const store = new VectorStore()

console.log("========== INSERT TESTS ==========")

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

store.insert({
  id: "doc-3",
  vector: [0, 1, 0],
  metadata: {
    source: "javascript.md",
    topic: "JavaScript",
  },
})

store.insert({
  id: "doc-4",
  vector: [0, 0, 1],
  metadata: {
    source: "node.md",
    topic: "Node.js",
  },
})

console.log("Inserted vectors successfully")
console.log()

console.log("========== GET TEST ==========")

console.log(store.get("doc-1"))

console.log()

console.log("========== SEARCH TEST ==========")

const results = store.search([0.8, 0.2, 0], 3)

console.log(results)

console.log()

console.log("========== UPDATE TEST ==========")

const updated = store.update("doc-1", {
  metadata: {
    source: "react-updated.md",
    topic: "React Updated",
  },
})

console.log(updated)

console.log()

console.log("========== DELETE TEST ==========")

const deleted = store.delete("doc-4")

console.log("Deleted:", deleted)

console.log("After delete:", store.get("doc-4"))

console.log()

console.log("========== FINAL SEARCH ==========")

console.log(store.search([0.8, 0.2, 0], 5))

console.log()

console.log("========== DIMENSION TEST ==========")

try {
  store.insert({
    id: "invalid-doc",
    vector: [1, 2],
    metadata: {
      source: "invalid.md",
    },
  })
} catch (error) {
  console.log(error.message)
}

console.log()

console.log("========== QUERY DIMENSION TEST ==========")

try {
  store.search([1, 2], 3)
} catch (error) {
  console.log(error.message)
}

console.log()

console.log("========== THRESHOLD TEST ==========")

const thresholdResults = store.search([0.8, 0.2, 0], 5, 0.8)

console.log(thresholdResults)
