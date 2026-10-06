const HNSWIndex = require("../src/index/HNSWIndex")

console.log("========== CREATE INDEX ==========")

const index = new HNSWIndex({
  M: 4,
  efConstruction: 100,
  efSearch: 50,
})

console.log(index)

console.log()

console.log("========== ADD NODE 1 ==========")

const node1 = index.addNode("doc-1", [1, 0, 0], 0)

console.log(node1)

console.log("Entry Point:", index.entryPoint)
console.log("Max Level:", index.maxLevel)

console.log()

console.log("========== ADD NODE 2 ==========")

const node2 = index.addNode("doc-2", [0.9, 0.1, 0], 1)

console.log(node2)

console.log("Entry Point:", index.entryPoint)
console.log("Max Level:", index.maxLevel)

console.log()

console.log("========== ADD NODE 3 ==========")

const node3 = index.addNode("doc-3", [0, 1, 0], 2)

console.log(node3)

console.log("Entry Point:", index.entryPoint)
console.log("Max Level:", index.maxLevel)

console.log()

console.log("========== INDEX INFO ==========")

console.log("Size:", index.size)
console.log("Entry Point:", index.entryPoint)
console.log("Max Level:", index.maxLevel)

console.log()

console.log("========== GET NODE ==========")

console.log(index.getNode("doc-2"))

console.log()

console.log("========== DUPLICATE TEST ==========")

try {
  index.addNode("doc-2", [1, 1, 1], 0)
} catch (error) {
  console.log(error.message)
}

console.log()

console.log("========== RANDOM LEVEL TEST ==========")

const levels = []

for (let i = 0; i < 1000; i++) {
  levels.push(index.getRandomLevel())
}

const distribution = {}

for (const level of levels) {
  distribution[level] = (distribution[level] || 0) + 1
}

console.log(distribution)
