const fs = require("fs")
const path = require("path")

const HNSWIndex = require("../src/index/HNSWIndex")

const HNSWStorage = require("../src/storage/HNSWStorage")

const storagePath = path.join(__dirname, "../data/hnsw-test.json")

if (fs.existsSync(storagePath)) {
  fs.unlinkSync(storagePath)
}

console.log("========== CREATE INDEX ==========")

const storage = new HNSWStorage(storagePath)

const index = new HNSWIndex({
  M: 2,
  efConstruction: 4,
  efSearch: 5,
  storage,
})

/*
 * Deterministic levels.
 */
index.getRandomLevel = () => 0

console.log("========== INSERT ==========")

index.insert("doc-1", [1, 0, 0])

index.insert("doc-2", [0.9, 0.1, 0])

index.insert("doc-3", [0.8, 0.2, 0])

index.insert("doc-4", [0, 1, 0])

console.log("Nodes:", index.size)

console.log("Entry Point:", index.entryPoint)

console.log("Max Level:", index.maxLevel)

console.log()

console.log("========== GRAPH BEFORE RELOAD ==========")

for (const node of index.nodes.values()) {
  console.log(node.id, node.getNeighbors(0))
}

console.log()

console.log("========== CHECK FILE ==========")

console.log("File exists:", fs.existsSync(storagePath))

console.log()

console.log("========== CREATE NEW INDEX ==========")

const loadedIndex = new HNSWIndex({
  storage: new HNSWStorage(storagePath),
})

console.log("Loaded nodes:", loadedIndex.size)

console.log("Loaded entry point:", loadedIndex.entryPoint)

console.log("Loaded max level:", loadedIndex.maxLevel)

console.log()

console.log("========== GRAPH AFTER RELOAD ==========")

for (const node of loadedIndex.nodes.values()) {
  console.log(node.id, node.getNeighbors(0))
}

console.log()

console.log("========== VERIFY PERSISTENCE ==========")

let persistencePassed = true

if (loadedIndex.size !== index.size) {
  persistencePassed = false

  console.log("FAILED: node count mismatch")
}

if (loadedIndex.entryPoint !== index.entryPoint) {
  persistencePassed = false

  console.log("FAILED: entry point mismatch")
}

if (loadedIndex.maxLevel !== index.maxLevel) {
  persistencePassed = false

  console.log("FAILED: max level mismatch")
}

for (const node of index.nodes.values()) {
  const loadedNode = loadedIndex.getNode(node.id)

  if (!loadedNode) {
    persistencePassed = false

    console.log(`FAILED: missing node ${node.id}`)

    continue
  }

  if (JSON.stringify(loadedNode.vector) !== JSON.stringify(node.vector)) {
    persistencePassed = false

    console.log(`FAILED: vector mismatch for ${node.id}`)
  }

  if (loadedNode.level !== node.level) {
    persistencePassed = false

    console.log(`FAILED: level mismatch for ${node.id}`)
  }

  for (let level = 0; level <= node.level; level++) {
    const originalNeighbors = node.getNeighbors(level).sort()

    const loadedNeighbors = loadedNode.getNeighbors(level).sort()

    if (JSON.stringify(originalNeighbors) !== JSON.stringify(loadedNeighbors)) {
      persistencePassed = false

      console.log(`FAILED: neighbors mismatch for ${node.id} at level ${level}`)
    }
  }
}

console.log(persistencePassed ? "PERSISTENCE PASSED" : "PERSISTENCE FAILED")

console.log()

console.log("========== SEARCH LOADED INDEX ==========")

const results = loadedIndex.search([0.85, 0.15, 0], 3)

console.log(results)

console.log()

console.log("========== MODIFY AFTER RELOAD ==========")

loadedIndex.delete("doc-2")

console.log("After delete:", loadedIndex.size)

const reloadedAfterDelete = new HNSWIndex({
  storage: new HNSWStorage(storagePath),
})

console.log("Reloaded after delete:", reloadedAfterDelete.size)

console.log("doc-2:", reloadedAfterDelete.getNode("doc-2"))

console.log()

console.log("========== FINAL VERIFY ==========")

const finalPassed =
  reloadedAfterDelete.getNode("doc-2") === null &&
  reloadedAfterDelete.size === 3

console.log(
  finalPassed ? "DELETE PERSISTENCE PASSED" : "DELETE PERSISTENCE FAILED",
)
