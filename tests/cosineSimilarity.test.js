const cosineSimilarity = require("../src/similarity/cosineSimilarity")

console.log("Test 1: Same vectors")

const result1 = cosineSimilarity([1, 0, 0], [1, 0, 0])

console.log(result1)
console.log("Expected: 1")
console.log()

console.log("Test 2: Perpendicular vectors")

const result2 = cosineSimilarity([1, 0, 0], [0, 1, 0])

console.log(result2)
console.log("Expected: 0")
console.log()

console.log("Test 3: Similar vectors")

const result3 = cosineSimilarity([1, 0, 0], [0.9, 0.1, 0])

console.log(result3)
console.log("Expected: approximately 0.994")
console.log()

console.log("Test 4: 3D vectors")

const result4 = cosineSimilarity([1, 2, 3], [4, 5, 6])

console.log(result4)
console.log("Expected: approximately 0.974")
console.log()

console.log("Test 5: Different dimensions")

try {
  cosineSimilarity([1, 2, 3], [4, 5])
} catch (error) {
  console.log(error.message)
}

console.log()

console.log("Test 6: Zero vector")

try {
  cosineSimilarity([0, 0, 0], [1, 2, 3])
} catch (error) {
  console.log(error.message)
}
