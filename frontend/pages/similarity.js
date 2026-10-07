/**
 * VectraDB Explorer - Cosine Similarity & Distance Explorer Page
 *
 * Dedicated educational workbench demonstrating:
 * - Cosine Similarity: S_C = (A · B) / (||A|| * ||B||)
 * - Cosine Distance: D_C = 1 - S_C
 * - Conceptual geometric angle: θ = arccos(S_C) in degrees
 * - Live embedding of custom input sentences or stored vector selection
 */

import { api } from "../api.js"
import { toast } from "../components/toast.js"
import { cosineSimilarity, cosineDistance, cosineAngleDegrees } from "../utils/math.js"
import { formatFloat, formatPercent, formatVectorPreview, escapeHtml } from "../utils/formatters.js"

const SAMPLE_PAIRS = [
  {
    name: "Highly Similar (React components)",
    textA: "React is a JavaScript library for building user interfaces.",
    textB: "React components manage state and render UI elements in web apps.",
  },
  {
    name: "Related Concepts (Vector Search & Databases)",
    textA: "Vector databases index high-dimensional embeddings for semantic search.",
    textB: "HNSW graphs find approximate nearest neighbors in vector spaces.",
  },
  {
    name: "Different Domains (React vs Cooking)",
    textA: "Next.js is a React framework for production web applications.",
    textB: "Chocolate chip cookies require flour, sugar, butter, and baking soda.",
  },
]

export class SimilarityPage {
  constructor(container) {
    this.container = container
    this.vectorA = null
    this.vectorB = null
    this.isCalculating = false
  }

  async render() {
    this.container.innerHTML = `
      <div class="page-container fade-in">
        <div class="page-header">
          <div>
            <h1 class="page-title">Cosine Similarity Explorer</h1>
            <p class="page-subtitle">Understand high-dimensional vector alignment, mathematical dot products, and cosine distance</p>
          </div>
        </div>

        <!-- Mathematical Overview Card -->
        <div class="card sim-math-card">
          <div class="math-grid">
            <div class="math-formula-box">
              <span class="math-label">Cosine Similarity Formula</span>
              <div class="formula-text font-mono">
                S<sub>C</sub>(A, B) = <span class="frac"><span>A · B</span><span class="symbol">/</span><span>||A|| × ||B||</span></span>
              </div>
              <span class="math-sub">Ranges from -1.0 (opposite) to +1.0 (identical direction)</span>
            </div>

            <div class="math-formula-box">
              <span class="math-label">Cosine Distance Formula</span>
              <div class="formula-text font-mono">
                D<sub>C</sub>(A, B) = 1 − S<sub>C</sub>(A, B)
              </div>
              <span class="math-sub">Ranges from 0.0 (identical) to 2.0 (diametrically opposed)</span>
            </div>

            <div class="math-formula-box">
              <span class="math-label">Geometric Angle (θ)</span>
              <div class="formula-text font-mono">
                θ = arccos(S<sub>C</sub>) × (180 / π)
              </div>
              <span class="math-sub">Angle between the two 384-dimensional vectors</span>
            </div>
          </div>
        </div>

        <!-- Input Comparison Grid -->
        <div class="sim-input-grid">
          <div class="card sim-panel">
            <div class="card-header">
              <h3 class="card-title">Vector / Text A</h3>
              <span class="badge-dim font-mono">Vector A</span>
            </div>
            <div class="form-group">
              <label class="form-label" for="sim-text-a">Input Sentence A</label>
              <textarea id="sim-text-a" class="form-textarea" rows="4" placeholder="Enter first text snippet..."></textarea>
            </div>
          </div>

          <div class="card sim-panel">
            <div class="card-header">
              <h3 class="card-title">Vector / Text B</h3>
              <span class="badge-dim font-mono">Vector B</span>
            </div>
            <div class="form-group">
              <label class="form-label" for="sim-text-b">Input Sentence B</label>
              <textarea id="sim-text-b" class="form-textarea" rows="4" placeholder="Enter second text snippet..."></textarea>
            </div>
          </div>
        </div>

        <!-- Action Bar & Presets -->
        <div class="card sim-action-bar">
          <div class="preset-pairs-group">
            <span class="preset-label">Load Comparison Pair:</span>
            ${SAMPLE_PAIRS.map((pair, idx) => `
              <button class="btn btn-xs btn-outline" data-pair-idx="${idx}">
                ${pair.name}
              </button>
            `).join("")}
          </div>

          <button class="btn btn-primary btn-lg" id="btn-calc-sim">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"></circle><line x1="2" y1="12" x2="22" y2="12"></line><path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"></path></svg>
            Compute 384D Similarity & Distance
          </button>
        </div>

        <!-- Comparison Results Display -->
        <div class="card sim-results-card hidden" id="sim-results-card">
          <div class="card-header">
            <h3 class="card-title">Comparison Results</h3>
            <span class="badge-emerald font-mono">384 Dimensions</span>
          </div>

          <div class="sim-metrics-display">
            <div class="sim-metric-big">
              <span class="metric-big-lbl">Cosine Similarity</span>
              <div class="metric-big-val color-emerald font-mono" id="res-similarity">0.0000</div>
              <span class="metric-big-sub" id="res-sim-pct">0.0% match</span>
            </div>

            <div class="sim-metric-big">
              <span class="metric-big-lbl">Cosine Distance</span>
              <div class="metric-big-val color-indigo font-mono" id="res-distance">0.0000</div>
              <span class="metric-big-sub font-mono">1.0 − CosineSimilarity</span>
            </div>

            <div class="sim-metric-big">
              <span class="metric-big-lbl">Subtended Angle (θ)</span>
              <div class="metric-big-val color-amber font-mono" id="res-angle">0.0°</div>
              <span class="metric-big-sub" id="res-angle-interp">Aligned</span>
            </div>
          </div>

          <!-- Visual Progress & Gauge -->
          <div class="sim-visual-gauge-section">
            <div class="gauge-label-row">
              <span>Dissimilar (0.0)</span>
              <span class="font-bold">Cosine Alignment</span>
              <span>Identical (1.0)</span>
            </div>
            <div class="similarity-progress-bg gauge-bar">
              <div class="similarity-progress-fill" id="gauge-fill" style="width: 0%"></div>
            </div>
          </div>

          <!-- Interpretation Summary -->
          <div class="sim-interpretation-box" id="res-interpretation"></div>
        </div>
      </div>
    `

    this.setupEvents()
    this.loadPair(0)
  }

  setupEvents() {
    const calcBtn = this.container.querySelector("#btn-calc-sim")
    if (calcBtn) {
      calcBtn.addEventListener("click", () => this.calculateSimilarity())
    }

    this.container.querySelectorAll("[data-pair-idx]").forEach((btn) => {
      btn.addEventListener("click", () => {
        const idx = Number(btn.getAttribute("data-pair-idx"))
        this.loadPair(idx)
      })
    })
  }

  loadPair(idx) {
    const pair = SAMPLE_PAIRS[idx]
    if (!pair) return
    const textA = this.container.querySelector("#sim-text-a")
    const textB = this.container.querySelector("#sim-text-b")
    textA.value = pair.textA
    textB.value = pair.textB
  }

  async calculateSimilarity() {
    if (this.isCalculating) return

    const textA = this.container.querySelector("#sim-text-a").value.trim()
    const textB = this.container.querySelector("#sim-text-b").value.trim()

    if (!textA || !textB) {
      toast.error("Please enter text for both Vector A and Vector B")
      return
    }

    this.isCalculating = true
    const calcBtn = this.container.querySelector("#btn-calc-sim")
    calcBtn.disabled = true
    calcBtn.innerHTML = `<span class="spinner-sm"></span> Generating 384D Embeddings...`

    try {
      // Embed both texts using the backend transformer model
      const [resA, resB] = await Promise.all([
        api.embedText({ text: textA, isQuery: false }),
        api.embedText({ text: textB, isQuery: false }),
      ])

      const vecA = resA.data.vector
      const vecB = resB.data.vector

      const sim = cosineSimilarity(vecA, vecB)
      const dist = cosineDistance(vecA, vecB)
      const angleDeg = cosineAngleDegrees(sim)

      this.renderResults({ sim, dist, angleDeg, vecA, vecB })
      toast.success("Similarity & distance computed")
    } catch (err) {
      toast.error(`Calculation error: ${err.message}`)
    } finally {
      this.isCalculating = false
      calcBtn.disabled = false
      calcBtn.innerHTML = `
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"></circle><line x1="2" y1="12" x2="22" y2="12"></line><path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"></path></svg>
        Compute 384D Similarity & Distance
      `
    }
  }

  renderResults({ sim, dist, angleDeg, vecA, vecB }) {
    const resultsCard = this.container.querySelector("#sim-results-card")
    resultsCard.classList.remove("hidden")

    const resSim = this.container.querySelector("#res-similarity")
    const resSimPct = this.container.querySelector("#res-sim-pct")
    const resDist = this.container.querySelector("#res-distance")
    const resAngle = this.container.querySelector("#res-angle")
    const resAngleInterp = this.container.querySelector("#res-angle-interp")
    const gaugeFill = this.container.querySelector("#gauge-fill")
    const interpBox = this.container.querySelector("#res-interpretation")

    resSim.textContent = formatFloat(sim, 4)
    resSimPct.textContent = `${(sim * 100).toFixed(2)}% Semantic Alignment`
    resDist.textContent = formatFloat(dist, 4)
    resAngle.textContent = `${angleDeg.toFixed(1)}°`

    const pctClamped = Math.max(0, Math.min(100, sim * 100))
    gaugeFill.style.width = `${pctClamped}%`

    let interpretation = ""
    let angleLabel = ""

    if (sim >= 0.85) {
      interpretation = `
        <div class="interp-highlight interp-green">
          <strong>🔥 Very High Semantic Match:</strong> The two vectors point in almost the exact same direction in 384-dimensional space (angle: ${angleDeg.toFixed(1)}°). The text passages convey nearly identical or strongly correlated conceptual meaning.
        </div>
      `
      angleLabel = "Parallel / Near Coincident"
    } else if (sim >= 0.65) {
      interpretation = `
        <div class="interp-highlight interp-cyan">
          <strong>✨ Strong Topical Relationship:</strong> The vectors share significant semantic sub-topics (angle: ${angleDeg.toFixed(1)}°). Ideal for Top-K candidate retrieval in RAG.
        </div>
      `
      angleLabel = "Acute Angle"
    } else if (sim >= 0.35) {
      interpretation = `
        <div class="interp-highlight interp-amber">
          <strong>⚠️ Moderate / Tangential Similarity:</strong> The passages belong to loosely related or adjacent knowledge areas (angle: ${angleDeg.toFixed(1)}°).
        </div>
      `
      angleLabel = "Wide Angle"
    } else {
      interpretation = `
        <div class="interp-highlight interp-rose">
          <strong>✕ Unrelated / Orthogonal:</strong> The vectors are nearly perpendicular in high-dimensional space (angle: ${angleDeg.toFixed(1)}°). The passages discuss completely independent subjects.
        </div>
      `
      angleLabel = "Near Orthogonal"
    }

    resAngleInterp.textContent = angleLabel
    interpBox.innerHTML = interpretation
  }
}
