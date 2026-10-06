const HNSWNode = require("./HNSWNode")
const MaxHeap = require("./MaxHeap")
const MinHeap = require("./MinHeap")
const cosineSimilarity = require("../similarity/cosineSimilarity")

class HNSWIndex {
  constructor({
    M = 4,
    efConstruction = 100,
    efSearch = 50,
    storage = null,
  } = {}) {
    this.M = M
    this.efConstruction = efConstruction
    this.efSearch = efSearch

    this.storage = storage

    this.nodes = new Map()

    this.entryPoint = null
    this.maxLevel = -1

    this.dimension = null

    this.load()
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

      this.save()

      return node
    }

    if (level > this.maxLevel) {
      this.maxLevel = level
      this.entryPoint = id
    }

    this.save()

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

      this.save()

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
       * Select best M candidates.
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
     * global entry point.
     */
    if (level > this.maxLevel) {
      this.entryPoint = id
      this.maxLevel = level
    }

    this.save()

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
     * Highest score is explored first.
     */
    const candidates = new MaxHeap((a, b) => a.score - b.score)

    /*
     * Result MinHeap:
     *
     * Lowest score stays at root.
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
       * If the best unexplored
       * candidate cannot beat the
       * worst retained result,
       * stop searching.
       */
      if (results.size >= ef) {
        const worstResult = results.peek()

        if (current.score <= worstResult.score) {
          break
        }
      }

      /*
       * Remove candidate from
       * exploration queue.
       */
      candidates.pop()

      const currentNode = this.getNode(current.id)

      if (!currentNode) {
        continue
      }

      const neighbors = currentNode.getNeighbors(level)

      for (const neighborId of neighbors) {
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
         * Candidate is always added
         * for possible exploration.
         */
        candidates.push(result)

        /*
         * Result heap still has space.
         */
        if (results.size < ef) {
          results.push(result)

          continue
        }

        /*
         * Result heap is full.
         */
        const worstResult = results.peek()

        /*
         * Replace worst result if
         * new candidate is better.
         */
        if (score > worstResult.score) {
          results.pop()

          results.push(result)
        }
      }
    }

    /*
     * Convert result heap into
     * descending score array.
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
     * efSearch exploration.
     */
    const results = this.searchLayer(
      queryVector,
      currentEntryPoint,
      0,
      this.efSearch,
    )

    return results.slice(0, topK)
  }

  delete(id) {
    const node = this.getNode(id)

    if (!node) {
      return false
    }

    /*
     * Remove this node from
     * every neighbor at every level.
     */
    for (let level = 0; level <= node.level; level++) {
      const neighbors = node.getNeighbors(level)

      for (const neighborId of neighbors) {
        const neighbor = this.getNode(neighborId)

        if (!neighbor) {
          continue
        }

        neighbor.removeNeighbor(level, id)
      }

      /*
       * Clear deleted node's
       * own neighbor lists.
       */
      for (const neighborId of neighbors) {
        node.removeNeighbor(level, neighborId)
      }
    }

    /*
     * Remove node from graph.
     */
    this.nodes.delete(id)

    /*
     * Graph is empty.
     */
    if (this.nodes.size === 0) {
      this.entryPoint = null
      this.maxLevel = -1
      this.dimension = null

      this.save()

      return true
    }

    /*
     * Deleted node was entry point.
     */
    if (this.entryPoint === id) {
      this.recalculateEntryPoint()
    }

    this.save()

    return true
  }

  recalculateEntryPoint() {
    let newEntryPoint = null

    let highestLevel = -1

    for (const node of this.nodes.values()) {
      if (node.level > highestLevel) {
        highestLevel = node.level

        newEntryPoint = node.id
      }
    }

    this.entryPoint = newEntryPoint

    this.maxLevel = highestLevel
  }

  update(id, newVector) {
    const node = this.getNode(id)

    if (!node) {
      throw new Error(`Node with ID "${id}" not found`)
    }

    if (!Array.isArray(newVector) || newVector.length === 0) {
      throw new Error("Vector must be a non-empty array")
    }

    if (newVector.length !== this.dimension) {
      throw new Error(`Vector dimension must be ${this.dimension}`)
    }

    /*
     * Remove old graph node.
     */
    this.delete(id)

    /*
     * Reinsert same ID with
     * new vector.
     */
    return this.insert(id, newVector)
  }

  save() {
    if (!this.storage) {
      return
    }

    const nodes = []

    for (const node of this.nodes.values()) {
      const neighbors = {}

      for (const [level, neighborIds] of node.neighbors) {
        neighbors[level] = Array.from(neighborIds)
      }

      nodes.push({
        id: node.id,
        vector: node.vector,
        level: node.level,
        neighbors,
      })
    }

    const data = {
      M: this.M,
      efConstruction: this.efConstruction,
      efSearch: this.efSearch,
      dimension: this.dimension,
      entryPoint: this.entryPoint,
      maxLevel: this.maxLevel,
      nodes,
    }

    this.storage.save(data)
  }

  load() {
    if (!this.storage) {
      return
    }

    const data = this.storage.load()

    if (!data) {
      return
    }

    this.M = data.M
    this.efConstruction = data.efConstruction
    this.efSearch = data.efSearch

    this.dimension = data.dimension

    this.entryPoint = data.entryPoint

    this.maxLevel = data.maxLevel

    this.nodes = new Map()

    for (const record of data.nodes) {
      const node = new HNSWNode(record.id, record.vector, record.level)

      for (const [level, neighborIds] of Object.entries(record.neighbors)) {
        const numericLevel = Number(level)

        for (const neighborId of neighborIds) {
          node.addNeighbor(numericLevel, neighborId)
        }
      }

      this.nodes.set(record.id, node)
    }
  }

  getNode(id) {
    return this.nodes.get(id) || null
  }

  get size() {
    return this.nodes.size
  }
}

module.exports = HNSWIndex
