const HNSWIndex = require("../src/index/HNSWIndex")

console.log("========== CREATE INDEX ==========")

const index = new HNSWIndex({
  M: 2,
  efConstruction: 4,
  efSearch: 5,
})

/*
 * Make the test deterministic.
 *
 * Every node gets level 0.
 *
 * This lets us focus specifically
 * on delete/update behavior.
 */
index.getRandomLevel = () => 0

console.log("========== INSERT ==========")

index.insert("doc-1", [1, 0, 0])

index.insert("doc-2", [0.9, 0.1, 0])

index.insert("doc-3", [0.8, 0.2, 0])

index.insert("doc-4", [0, 1, 0])

index.insert("doc-5", [0, 0, 1])

console.log("Total nodes:", index.size)

console.log("Entry Point:", index.entryPoint)

console.log("Max Level:", index.maxLevel)

console.log()

console.log("========== GRAPH BEFORE DELETE ==========")

for (const node of index.nodes.values()) {
  console.log(node.id, node.getNeighbors(0))
}

console.log()

console.log("========== DELETE doc-2 ==========")

const deleteResult = index.delete("doc-2")

console.log("Delete result:", deleteResult)

console.log("Total nodes:", index.size)

console.log("doc-2:", index.getNode("doc-2"))

console.log()

console.log("========== VERIFY DELETE ==========")

let deletePassed = true

/*
 * Deleted node must no longer exist.
 */
if (index.getNode("doc-2") !== null) {
  deletePassed = false

  console.log("FAILED: doc-2 still exists")
}

/*
 * No remaining node should reference
 * doc-2.
 */
for (const node of index.nodes.values()) {
  const neighbors = node.getNeighbors(0)

  if (neighbors.includes("doc-2")) {
    deletePassed = false

    console.log(`FAILED: ${node.id} still references doc-2`)
  }
}

console.log(deletePassed ? "DELETE PASSED" : "DELETE FAILED")

console.log()

console.log("========== GRAPH AFTER DELETE ==========")

for (const node of index.nodes.values()) {
  console.log(node.id, node.getNeighbors(0))
}

console.log()

console.log("========== SEARCH AFTER DELETE ==========")

const searchAfterDelete = index.search([0.85, 0.15, 0], 3)

console.log(searchAfterDelete)

console.log()

console.log("========== UPDATE doc-3 ==========")

const updatedNode = index.update("doc-3", [0, 0, 1])

console.log("Updated node:", updatedNode)

console.log("Total nodes:", index.size)

console.log()

console.log("========== VERIFY UPDATE ==========")

let updatePassed = true

const nodeAfterUpdate = index.getNode("doc-3")

if (!nodeAfterUpdate) {
  updatePassed = false

  console.log("FAILED: doc-3 does not exist")
}

if (JSON.stringify(nodeAfterUpdate.vector) !== JSON.stringify([0, 0, 1])) {
  updatePassed = false

  console.log("FAILED: vector was not updated")
}

/*
 * No duplicate IDs should exist.
 */
if (index.size !== 4) {
  updatePassed = false

  console.log("FAILED: unexpected node count")
}

console.log(updatePassed ? "UPDATE PASSED" : "UPDATE FAILED")

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

        console.log(`FAILED: missing node ${neighborId}`)

        continue
      }

      if (!neighbor.getNeighbors(level).includes(node.id)) {
        symmetryPassed = false

        console.log(`FAILED: broken edge ${node.id} <-> ${neighborId}`)
      }
    }
  }
}

console.log(symmetryPassed ? "GRAPH SYMMETRY PASSED" : "GRAPH SYMMETRY FAILED")
