const HNSWIndex = require("../src/index/HNSWIndex")

console.log("========== CREATE INDEX ==========")

const index = new HNSWIndex({
  M: 2,
  efConstruction: 4,
  efSearch: 5,
})

console.log("M:", index.M)

console.log("efConstruction:", index.efConstruction)

console.log("efSearch:", index.efSearch)

console.log()

console.log("========== INSERT DOCUMENTS ==========")

index.insert("doc-1", [1, 0, 0])

index.insert("doc-2", [0.9, 0.1, 0])

index.insert("doc-3", [0, 1, 0])

index.insert("doc-4", [0, 0, 1])

index.insert("doc-5", [0.85, 0.15, 0])

console.log("Total nodes:", index.size)

console.log("Entry Point:", index.entryPoint)

console.log("Max Level:", index.maxLevel)

console.log()

console.log("========== GRAPH ==========")

for (const node of index.nodes.values()) {
  console.log(
    `${node.id} Level 0:`,
    node.getNeighbors(0),
    "Count:",
    node.getNeighbors(0).length,
  )

  if (node.level >= 1) {
    console.log(
      `${node.id} Level 1:`,
      node.getNeighbors(1),
      "Count:",
      node.getNeighbors(1).length,
    )
  }

  if (node.level >= 2) {
    console.log(
      `${node.id} Level 2:`,
      node.getNeighbors(2),
      "Count:",
      node.getNeighbors(2).length,
    )
  }
}

console.log()

console.log("========== VERIFY M ==========")

let pruningPassed = true

for (const node of index.nodes.values()) {
  for (let level = 0; level <= node.level; level++) {
    const count = node.getNeighbors(level).length

    console.log(`${node.id} level ${level}: ${count}/${index.M}`)

    if (count > index.M) {
      pruningPassed = false
    }
  }
}

console.log()

console.log(pruningPassed ? "M LIMIT PASSED" : "M LIMIT FAILED")

console.log()

console.log("========== VERIFY GRAPH SYMMETRY ==========")

let symmetryPassed = true

for (const node of index.nodes.values()) {
  for (let level = 0; level <= node.level; level++) {
    const neighbors = node.getNeighbors(level)

    for (const neighborId of neighbors) {
      const neighbor = index.getNode(neighborId)

      if (!neighbor) {
        symmetryPassed = false

        console.log(`Missing neighbor node: ${neighborId}`)

        continue
      }

      const reverseNeighbors = neighbor.getNeighbors(level)

      if (!reverseNeighbors.includes(node.id)) {
        symmetryPassed = false

        console.log(
          `Broken edge: ${node.id} <-> ${neighborId} at level ${level}`,
        )
      }
    }
  }
}

console.log(symmetryPassed ? "GRAPH SYMMETRY PASSED" : "GRAPH SYMMETRY FAILED")

console.log()

console.log("========== SEARCH LAYER ==========")

const layerResults = index.searchLayer(
  [0.8, 0.2, 0],
  index.entryPoint,
  0,
  index.efConstruction,
)

console.log("Layer candidates:")

console.log(layerResults)

console.log("Candidate count:", layerResults.length)

console.log("Candidate limit:", index.efConstruction)

console.log()

console.log("========== FINAL SEARCH ==========")

const results = index.search([0.8, 0.2, 0], 3)

console.log(results)
