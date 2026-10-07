/**
 * VectraDB Explorer - Principal Component Analysis (PCA) 2D Projection
 *
 * Mathematical principle:
 * Reduces 384-dimensional embedding vectors into 2D coordinates (x, y).
 *
 * Distance-Preserving Cosine Radial PCA Projection:
 * 1. Computes top-2 eigenvectors (v1, v2) via Power Iteration to capture principal variance directions.
 * 2. When projecting against a Query Vector:
 *    - Preserves directional angle θ = atan2(v_i - v_q, u_i - u_q) from PCA space.
 *    - Maps radial distance directly to Cosine Distance (1 - CosineSimilarity):
 *      High-similarity embeddings (e.g. Rank #1 source chunk, S ≈ 0.91, Dist ≈ 0.09)
 *      are positioned in close proximity (45px-65px) to the Query Star.
 *    - Distant/unrelated embeddings (Dist ≈ 0.7-1.0) are placed proportionally far outward.
 * 3. When projecting without a Query:
 *    - Uses isotropic (uniform aspect ratio) PCA scaling to prevent spatial distortion.
 */

import { dotProduct, norm, cosineSimilarity, cosineDistance } from "./math.js"

export class PCAProjector {
  constructor() {
    this.mean = null
    this.v1 = null
    this.v2 = null
    this.dimension = null
    this.isTrained = false
  }

  /**
   * Fit the PCA model on an array of high-dimensional vectors (e.g. 384D)
   * @param {Array<Array<number>>} vectors - Array of vectors
   * @param {number} iterations - Power iteration steps per principal component
   */
  fit(vectors, iterations = 35) {
    if (!Array.isArray(vectors) || vectors.length === 0) {
      this.isTrained = false
      return this
    }

    const validVectors = vectors.filter(
      (v) => Array.isArray(v) && v.length > 0,
    )

    if (validVectors.length === 0) {
      this.isTrained = false
      return this
    }

    const N = validVectors.length
    const D = validVectors[0].length
    this.dimension = D

    // Step 1: Compute dataset mean vector μ
    const mean = new Array(D).fill(0)
    for (let i = 0; i < N; i++) {
      const vec = validVectors[i]
      for (let j = 0; j < D; j++) {
        mean[j] += vec[j]
      }
    }
    for (let j = 0; j < D; j++) {
      mean[j] /= N
    }
    this.mean = mean

    // If only 1 vector, 2D projection is at origin (0, 0)
    if (N === 1) {
      this.v1 = new Array(D).fill(0)
      this.v1[0] = 1
      this.v2 = new Array(D).fill(0)
      this.v2[Math.min(1, D - 1)] = 1
      this.isTrained = true
      return this
    }

    // Step 2: Compute centered vectors: X_centered = X - μ
    const centered = validVectors.map((vec) => {
      const c = new Array(D)
      for (let j = 0; j < D; j++) {
        c[j] = vec[j] - mean[j]
      }
      return c
    })

    // Step 3: Find 1st Principal Component (v1) using Power Iteration
    let v1 = new Array(D)
    for (let j = 0; j < D; j++) {
      v1[j] = Math.sin(j + 1) + 0.1
    }
    let normV1 = norm(v1)
    for (let j = 0; j < D; j++) v1[j] /= normV1 || 1

    for (let iter = 0; iter < iterations; iter++) {
      const w = new Array(D).fill(0)
      for (let i = 0; i < N; i++) {
        const row = centered[i]
        const dot = dotProduct(row, v1)
        for (let j = 0; j < D; j++) {
          w[j] += row[j] * dot
        }
      }
      const wNorm = norm(w)
      if (wNorm > 1e-12) {
        for (let j = 0; j < D; j++) {
          v1[j] = w[j] / wNorm
        }
      }
    }
    this.v1 = v1

    // Step 4: Find 2nd Principal Component (v2) orthogonal to v1
    let v2 = new Array(D)
    for (let j = 0; j < D; j++) {
      v2[j] = Math.cos((j + 1) * 1.5) + 0.2
    }
    let dot12 = dotProduct(v2, v1)
    for (let j = 0; j < D; j++) {
      v2[j] -= dot12 * v1[j]
    }
    let normV2 = norm(v2)
    for (let j = 0; j < D; j++) v2[j] /= normV2 || 1

    for (let iter = 0; iter < iterations; iter++) {
      const w = new Array(D).fill(0)
      for (let i = 0; i < N; i++) {
        const row = centered[i]
        const dot = dotProduct(row, v2)
        for (let j = 0; j < D; j++) {
          w[j] += row[j] * dot
        }
      }
      // Gram-Schmidt deflation against v1
      const dotW1 = dotProduct(w, v1)
      for (let j = 0; j < D; j++) {
        w[j] -= dotW1 * v1[j]
      }
      const wNorm = norm(w)
      if (wNorm > 1e-12) {
        for (let j = 0; j < D; j++) {
          v2[j] = w[j] / wNorm
        }
      }
    }
    this.v2 = v2
    this.isTrained = true
    return this
  }

  /**
   * Project a single high-dimensional vector onto the 2D PCA plane
   * @param {Array<number>} vector - 384D vector
   * @returns {{ u: number, v: number }} - 2D PCA coordinates
   */
  project(vector) {
    if (!this.isTrained || !Array.isArray(vector) || !this.mean || !this.v1 || !this.v2) {
      return { u: 0, v: 0 }
    }

    const D = Math.min(vector.length, this.dimension)
    const centered = new Array(D)
    for (let j = 0; j < D; j++) {
      centered[j] = vector[j] - (this.mean[j] || 0)
    }

    let u = 0
    let v = 0
    for (let j = 0; j < D; j++) {
      u += centered[j] * (this.v1[j] || 0)
      v += centered[j] * (this.v2[j] || 0)
    }

    return { u, v }
  }

  /**
   * Project multiple vectors and map them to canvas pixel coordinates.
   * Ensures that the Query Star is positioned in close proximity to the embedding
   * representation where it is taking its information from (Rank #1 / highest similarity).
   *
   * @param {Array<{ id: string, vector: Array<number>, ... }>} items
   * @param {Array<number>|null} queryVector
   * @param {{ width: number, height: number, padding: number }} viewport
   * @returns {{ points: Array<{ id: string, x: number, y: number, u: number, v: number, item: any }>, queryPoint: { x: number, y: number, u: number, v: number }|null }}
   */
  projectToViewport(items, queryVector = null, viewport = { width: 600, height: 400, padding: 60 }) {
    const allVectors = []
    if (queryVector && Array.isArray(queryVector)) {
      allVectors.push(queryVector)
    }
    for (const item of items) {
      if (item && Array.isArray(item.vector)) {
        allVectors.push(item.vector)
      }
    }

    if (allVectors.length === 0) {
      return { points: [], queryPoint: null }
    }

    // Fit PCA on the union of query vector and stored/candidate vectors
    this.fit(allVectors)

    const { width, height, padding } = viewport
    const usableWidth = Math.max(100, width - padding * 2)
    const usableHeight = Math.max(100, height - padding * 2)
    const centerX = width / 2
    const centerY = height / 2

    if (queryVector && Array.isArray(queryVector)) {
      // -------------------------------------------------------------
      // Query-Centric Cosine Distance Proximity Projection
      // -------------------------------------------------------------
      const queryCoord = this.project(queryVector)
      const queryPoint = {
        x: centerX,
        y: centerY,
        u: queryCoord.u,
        v: queryCoord.v,
      }

      const maxRadius = Math.min(usableWidth, usableHeight) * 0.44
      const minRadius = 52 // Minimum margin so query star and node label badges remain legible without overlapping

      const points = items.map((item, idx) => {
        const coord = this.project(item.vector)
        const sim = cosineSimilarity(queryVector, item.vector)
        const dist = cosineDistance(queryVector, item.vector)

        // Direction in PCA space relative to Query
        const du = coord.u - queryCoord.u
        const dv = coord.v - queryCoord.v
        let angle = Math.atan2(dv, du)

        // Fallback angle if collinear or identical
        if (Math.abs(du) < 1e-6 && Math.abs(dv) < 1e-6) {
          angle = (idx / Math.max(1, items.length)) * Math.PI * 2
        }

        // Radial distance directly governed by Cosine Distance (1 - Similarity)
        // Highly similar source items (dist < 0.1) map close to minRadius (52px - 70px)
        // Dissimilar items (dist > 0.6) map to outer radius (180px - 220px)
        const clampedDist = Math.max(0, Math.min(1.2, dist))
        const radius = minRadius + (maxRadius - minRadius) * Math.pow(clampedDist, 0.75)

        const x = centerX + radius * Math.cos(angle)
        // Invert Y so positive V points upward
        const y = centerY - radius * Math.sin(angle)

        return {
          ...item,
          x,
          y,
          u: coord.u,
          v: coord.v,
          score: item.score !== undefined ? item.score : sim,
          cosineDistance: item.cosineDistance !== undefined ? item.cosineDistance : dist,
        }
      })

      return { points, queryPoint }
    } else {
      // -------------------------------------------------------------
      // Standard Isotropic PCA Projection (No Query)
      // -------------------------------------------------------------
      const rawProjections = items.map((item) => {
        const coord = this.project(item.vector)
        return {
          item,
          u: coord.u,
          v: coord.v,
        }
      })

      let minU = rawProjections[0]?.u ?? 0
      let maxU = rawProjections[0]?.u ?? 0
      let minV = rawProjections[0]?.v ?? 0
      let maxV = rawProjections[0]?.v ?? 0

      for (const p of rawProjections) {
        if (p.u < minU) minU = p.u
        if (p.u > maxU) maxU = p.u
        if (p.v < minV) minV = p.v
        if (p.v > maxV) maxV = p.v
      }

      const rangeU = maxU - minU || 0.1
      const rangeV = maxV - minV || 0.1
      const maxSpan = Math.max(rangeU, rangeV)
      const scale = Math.min(usableWidth, usableHeight) / (maxSpan || 1)

      const midU = (minU + maxU) / 2
      const midV = (minV + maxV) / 2

      const points = rawProjections.map((p) => ({
        ...p.item,
        x: centerX + (p.u - midU) * scale,
        y: centerY - (p.v - midV) * scale,
        u: p.u,
        v: p.v,
      }))

      return { points, queryPoint: null }
    }
  }
}
