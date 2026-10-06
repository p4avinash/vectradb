const HNSWNode = require("./HNSWNode")
const MaxHeap = require("./MaxHeap")
const MinHeap = require("./MinHeap")
const cosineSimilarity = require("../similarity/cosineSimilarity")

class HNSWIndex {
  constructor({ M = 4, efConstruction = 100, efSearch = 50 } = {}) {
    this.M = M
    this.efConstruction = efConstruction
    this.efSearch = efSearch

    this.nodes = new Map()

    this.entryPoint = null
    this.maxLevel = -1

    this.dimension = null
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

    if (this.dimension === null) {
      this.dimension = vector.length
    }

    if (vector.length !== this.dimension) {
      throw new Error(`Vector dimension must be ${this.dimension}`)
    }

    const node = new HNSWNode(id, vector, level)

    this.nodes.set(id, node)

    if (this.entryPoint === null) {
      this.entryPoint = id
      this.maxLevel = level

      return node
    }

    if (level > this.maxLevel) {
      this.maxLevel = level
      this.entryPoint = id
    }

    return node
  }

  insert(id, vector) {
    if (this.nodes.has(id)) {
      throw new Error(`Node with ID "${id}" already exists`)
    }

    if (!Array.isArray(vector) || vector.length === 0) {
      throw new Error("Vector must be a non-empty array")
    }

    if (this.dimension === null) {
      this.dimension = vector.length
    }

    if (vector.length !== this.dimension) {
      throw new Error(`Vector dimension must be ${this.dimension}`)
    }

    const level = this.getRandomLevel()

    const node = new HNSWNode(id, vector, level)

    /*
     * First node.
     */
    if (this.entryPoint === null) {
      this.nodes.set(id, node)

      this.entryPoint = id
      this.maxLevel = level

      return node
    }

    /*
     * Add node before searching.
     */
    this.nodes.set(id, node)

    let currentEntryPoint = this.entryPoint

    /*
     * Traverse upper levels
     * using greedy search.
     */
    for (
      let currentLevel = this.maxLevel;
      currentLevel > level;
      currentLevel--
    ) {
      const currentNode = this.getNode(currentEntryPoint)

      if (!currentNode || currentNode.level < currentLevel) {
        continue
      }

      const result = this.greedySearch(vector, currentEntryPoint, currentLevel)

      currentEntryPoint = result.id
    }

    /*
     * Insert into every level
     * where the new node exists.
     */
    const insertionTopLevel = Math.min(level, this.maxLevel)

    for (
      let currentLevel = insertionTopLevel;
      currentLevel >= 0;
      currentLevel--
    ) {
      /*
       * Explore graph using
       * efConstruction.
       */
      const candidates = this.searchLayer(
        vector,
        currentEntryPoint,
        currentLevel,
        this.efConstruction,
      )

      /*
       * Take best M candidates
       * for actual connections.
       */
      const neighbors = candidates.slice(0, this.M)

      for (const neighbor of neighbors) {
        this.connectAndPrune(id, neighbor.id, currentLevel)
      }

      /*
       * Best candidate becomes
       * entry point for next level.
       */
      if (candidates.length > 0) {
        currentEntryPoint = candidates[0].id
      }
    }

    /*
     * Higher-level node becomes
     * new global entry point.
     */
    if (level > this.maxLevel) {
      this.entryPoint = id
      this.maxLevel = level
    }

    return node
  }

  connectNodes(nodeId, neighborId, level) {
    const node = this.getNode(nodeId)

    const neighbor = this.getNode(neighborId)

    if (!node || !neighbor) {
      throw new Error("Both nodes must exist")
    }

    if (nodeId === neighborId) {
      return
    }

    if (level > node.level) {
      throw new Error(`Node "${nodeId}" does not exist at level ${level}`)
    }

    if (level > neighbor.level) {
      throw new Error(`Node "${neighborId}" does not exist at level ${level}`)
    }

    node.addNeighbor(level, neighborId)

    neighbor.addNeighbor(level, nodeId)
  }

  connectAndPrune(nodeId, neighborId, level) {
    this.connectNodes(nodeId, neighborId, level)

    this.pruneNeighbors(nodeId, level)

    this.pruneNeighbors(neighborId, level)
  }

  pruneNeighbors(nodeId, level) {
    const node = this.getNode(nodeId)

    if (!node) {
      throw new Error(`Node "${nodeId}" not found`)
    }

    const neighbors = node.getNeighbors(level)

    if (neighbors.length <= this.M) {
      return
    }

    const scoredNeighbors = neighbors.map((neighborId) => {
      const neighbor = this.getNode(neighborId)

      return {
        id: neighborId,
        score: cosineSimilarity(node.vector, neighbor.vector),
      }
    })

    scoredNeighbors.sort((a, b) => b.score - a.score)

    const keep = scoredNeighbors.slice(0, this.M)

    const keepIds = new Set(keep.map((item) => item.id))

    for (const neighborId of neighbors) {
      if (keepIds.has(neighborId)) {
        continue
      }

      const neighbor = this.getNode(neighborId)

      if (neighbor) {
        neighbor.removeNeighbor(level, nodeId)
      }

      node.removeNeighbor(level, neighborId)
    }
  }

  searchLayer(queryVector, entryPointId, level, ef) {
    const entryPoint = this.getNode(entryPointId)

    if (!entryPoint) {
      throw new Error(`Entry point "${entryPointId}" not found`)
    }

    if (level > entryPoint.level) {
      throw new Error(`Entry point does not exist at level ${level}`)
    }

    if (!Array.isArray(queryVector) || queryVector.length === 0) {
      throw new Error("Vector must be a non-empty array")
    }

    if (queryVector.length !== this.dimension) {
      throw new Error(`Query vector dimension must be ${this.dimension}`)
    }

    if (!Number.isInteger(ef) || ef <= 0) {
      throw new Error("ef must be greater than 0")
    }

    /*
     * Candidate MaxHeap:
     *
     * Highest score gets explored first.
     */
    const candidates = new MaxHeap((a, b) => a.score - b.score)

    /*
     * Result MinHeap:
     *
     * Lowest score among retained
     * results stays at the root.
     */
    const results = new MinHeap((a, b) => a.score - b.score)

    const visited = new Set()

    const entryScore = cosineSimilarity(queryVector, entryPoint.vector)

    const entryResult = {
      id: entryPoint.id,
      score: entryScore,
    }

    candidates.push(entryResult)

    results.push(entryResult)

    visited.add(entryPoint.id)

    while (!candidates.isEmpty()) {
      /*
       * Best unexplored candidate.
       */
      const current = candidates.peek()

      /*
       * If we already have ef results
       * and the best unexplored node
       * cannot beat the worst result,
       * we can stop.
       */
      if (results.size >= ef) {
        const worstResult = results.peek()

        if (current.score <= worstResult.score) {
          break
        }
      }

      /*
       * Remove best candidate from
       * exploration queue.
       */
      candidates.pop()

      const currentNode = this.getNode(current.id)

      if (!currentNode) {
        continue
      }

      const neighbors = currentNode.getNeighbors(level)

      for (const neighborId of neighbors) {
        /*
         * Never explore the same node
         * twice.
         */
        if (visited.has(neighborId)) {
          continue
        }

        visited.add(neighborId)

        const neighbor = this.getNode(neighborId)

        if (!neighbor) {
          continue
        }

        const score = cosineSimilarity(queryVector, neighbor.vector)

        const result = {
          id: neighborId,
          score,
        }

        /*
         * Always consider this node
         * for future exploration.
         */
        candidates.push(result)

        /*
         * Result set still has space.
         */
        if (results.size < ef) {
          results.push(result)

          continue
        }

        /*
         * Result set is full.
         *
         * Replace the worst result
         * only if this node is better.
         */
        const worstResult = results.peek()

        if (score > worstResult.score) {
          results.pop()

          results.push(result)
        }
      }
    }

    /*
     * Convert result heap into
     * sorted descending array.
     */
    const finalResults = []

    while (!results.isEmpty()) {
      finalResults.push(results.pop())
    }

    finalResults.sort((a, b) => b.score - a.score)

    return finalResults
  }

  findNearestNeighbors(vector, level = 0, limit = this.M, excludeId = null) {
    if (!Array.isArray(vector) || vector.length === 0) {
      throw new Error("Vector must be a non-empty array")
    }

    const candidates = []

    for (const node of this.nodes.values()) {
      if (node.id === excludeId) {
        continue
      }

      if (node.level < level) {
        continue
      }

      const score = cosineSimilarity(vector, node.vector)

      candidates.push({
        id: node.id,
        score,
      })
    }

    candidates.sort((a, b) => b.score - a.score)

    return candidates.slice(0, limit)
  }

  greedySearch(queryVector, entryPointId, level) {
    if (!Array.isArray(queryVector) || queryVector.length === 0) {
      throw new Error("Vector must be a non-empty array")
    }

    const entryPoint = this.getNode(entryPointId)

    if (!entryPoint) {
      throw new Error(`Entry point "${entryPointId}" not found`)
    }

    if (level > entryPoint.level) {
      throw new Error(`Entry point does not exist at level ${level}`)
    }

    let currentNode = entryPoint

    let currentScore = cosineSimilarity(queryVector, currentNode.vector)

    let improved = true

    while (improved) {
      improved = false

      const neighbors = currentNode.getNeighbors(level)

      for (const neighborId of neighbors) {
        const neighbor = this.getNode(neighborId)

        if (!neighbor) {
          continue
        }

        const neighborScore = cosineSimilarity(queryVector, neighbor.vector)

        if (neighborScore > currentScore) {
          currentNode = neighbor

          currentScore = neighborScore

          improved = true
        }
      }
    }

    return {
      id: currentNode.id,
      score: currentScore,
    }
  }

  searchLevelZero(queryVector, entryPointId) {
    return this.searchLayer(queryVector, entryPointId, 0, this.efSearch)
  }

  search(queryVector, topK = 5) {
    if (!Array.isArray(queryVector) || queryVector.length === 0) {
      throw new Error("Query vector must be a non-empty array")
    }

    if (this.dimension !== null && queryVector.length !== this.dimension) {
      throw new Error(`Query vector dimension must be ${this.dimension}`)
    }

    if (topK <= 0) {
      throw new Error("topK must be greater than 0")
    }

    if (this.entryPoint === null) {
      return []
    }

    let currentEntryPoint = this.entryPoint

    /*
     * Upper levels:
     * greedy search.
     */
    for (let level = this.maxLevel; level > 0; level--) {
      const currentNode = this.getNode(currentEntryPoint)

      if (!currentNode || currentNode.level < level) {
        continue
      }

      const result = this.greedySearch(queryVector, currentEntryPoint, level)

      currentEntryPoint = result.id
    }

    /*
     * Level 0:
     * proper efSearch exploration.
     */
    const results = this.searchLayer(
      queryVector,
      currentEntryPoint,
      0,
      this.efSearch,
    )

    /*
     * Return only requested Top-K.
     */
    return results.slice(0, topK)
  }

  getNode(id) {
    return this.nodes.get(id) || null
  }

  get size() {
    return this.nodes.size
  }
}

module.exports = HNSWIndex
