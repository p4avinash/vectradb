const HNSWNode = require("./HNSWNode")

class HNSWIndex {
  constructor({ M = 4, efConstruction = 100, efSearch = 50 } = {}) {
    this.M = M
    this.efConstruction = efConstruction
    this.efSearch = efSearch

    this.nodes = new Map()

    this.entryPoint = null
    this.maxLevel = -1
  }

  getRandomLevel(maxLevel = 16) {
    let level = 0

    while (Math.random() < 0.5 && level < maxLevel) {
      level++
    }

    return level
  }

  addNode(id, vector, level) {
    if (this.nodes.has(id)) {
      throw new Error(`Node with ID "${id}" already exists`)
    }

    if (!Array.isArray(vector) || vector.length === 0) {
      throw new Error("Vector must be a non-empty array")
    }

    if (!Number.isInteger(level) || level < 0) {
      throw new Error("Level must be a non-negative integer")
    }

    const node = new HNSWNode(id, vector, level)

    this.nodes.set(id, node)

    if (this.entryPoint === null) {
      this.entryPoint = id
      this.maxLevel = level
    }

    if (level > this.maxLevel) {
      this.maxLevel = level
      this.entryPoint = id
    }

    return node
  }

  getNode(id) {
    return this.nodes.get(id) || null
  }

  get size() {
    return this.nodes.size
  }
}

module.exports = HNSWIndex
