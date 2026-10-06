const HNSWNode = require("../src/index/HNSWNode")

console.log("========== CREATE NODE ==========")

const node = new HNSWNode("doc-1", [1, 0, 0], 2)

console.log(node)

console.log()

console.log("========== ADD NEIGHBORS ==========")

node.addNeighbor(0, "doc-2")
node.addNeighbor(0, "doc-3")

node.addNeighbor(1, "doc-4")

node.addNeighbor(2, "doc-5")

console.log()

console.log("========== LEVEL 0 ==========")

console.log(node.getNeighbors(0))

console.log()

console.log("========== LEVEL 1 ==========")

console.log(node.getNeighbors(1))

console.log()

console.log("========== LEVEL 2 ==========")

console.log(node.getNeighbors(2))

console.log()

console.log("========== INVALID LEVEL ==========")

try {
  node.addNeighbor(3, "doc-6")
} catch (error) {
  console.log(error.message)
}
