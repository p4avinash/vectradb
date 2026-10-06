class HNSWNode {
  constructor(id, vector, level) {
    this.id = id
    this.vector = vector
    this.level = level

    // Each level has its own neighbors
    this.neighbors = new Map()

    for (let i = 0; i <= level; i++) {
      this.neighbors.set(i, new Set())
    }
  }

  addNeighbor(level, neighborId) {
    if (!this.neighbors.has(level)) {
      throw new Error(`Level ${level} does not exist for node "${this.id}"`)
    }

    this.neighbors.get(level).add(neighborId)
  }

  getNeighbors(level) {
    if (!this.neighbors.has(level)) {
      return []
    }

    return Array.from(this.neighbors.get(level))
  }
}

module.exports = HNSWNode
