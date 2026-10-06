const MaxHeap = require("../src/index/MaxHeap")
const MinHeap = require("../src/index/MinHeap")

console.log("========== MAX HEAP ==========")

const maxHeap = new MaxHeap((a, b) => a.score - b.score)

maxHeap.push({
  id: "A",
  score: 0.8,
})

maxHeap.push({
  id: "B",
  score: 0.99,
})

maxHeap.push({
  id: "C",
  score: 0.7,
})

maxHeap.push({
  id: "D",
  score: 0.95,
})

console.log("Pop order:")

while (!maxHeap.isEmpty()) {
  console.log(maxHeap.pop())
}

console.log()

console.log("========== MIN HEAP ==========")

const minHeap = new MinHeap((a, b) => a.score - b.score)

minHeap.push({
  id: "A",
  score: 0.8,
})

minHeap.push({
  id: "B",
  score: 0.99,
})

minHeap.push({
  id: "C",
  score: 0.7,
})

minHeap.push({
  id: "D",
  score: 0.95,
})

console.log("Pop order:")

while (!minHeap.isEmpty()) {
  console.log(minHeap.pop())
}
