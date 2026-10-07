/**
 * VectraDB Explorer - Minimalist Query & RAG Playground Page
 *
 * Clean developer workbench:
 * - Minimalist search bar with preset pills
 * - Top-K and Threshold sliders
 * - 2D Vector Space Scatter Plot (Clean PCA Projection)
 * - Ranked Top-K Result Cards with Cosine Similarity and Cosine Distance
 * - Grounded AI Response with collapsible raw context
 */

import { api } from "../api.js"
import { VectorSpaceVisualizer } from "../visualizations/vectorSpace.js"
import { modal } from "../components/modal.js"
import { toast } from "../components/toast.js"
import { formatFloat, formatPercent, truncateText, escapeHtml } from "../utils/formatters.js"

const PRESET_QUERIES = [
  "What is React used for?",
  "How does HNSW graph indexing work?",
  "What are dense vector embeddings?",
  "What is Next.js framework?",
]

export class QueryPage {
  constructor(container) {
    this.container = container
    this.visualizer = null
    this.storedVectors = []
    this.lastQueryResult = null
    this.isSearching = false
  }

  async render() {
    this.container.innerHTML = `
      <div class="page-container fade-in">
        <div class="page-header">
          <div>
            <h1 class="page-title">Query & RAG Playground</h1>
            <p class="page-subtitle">Execute semantic search, observe 384D cosine distances in 2D space, and inspect RAG context</p>
          </div>
        </div>

        <!-- Query Input Toolbar -->
        <div class="card query-input-card">
          <form id="query-search-form" class="query-form">
            <div class="query-bar-wrapper">
              <div class="query-input-icon">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="11" cy="11" r="8"></circle><line x1="21" y1="21" x2="16.65" y2="16.65"></line></svg>
              </div>
              <input type="text" id="query-input-text" class="query-input-field" placeholder="Ask a question or enter search text..." value="What is React used for?" required />
              <button type="submit" class="btn btn-primary btn-search" id="btn-run-query">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="11" cy="11" r="8"></circle><line x1="21" y1="21" x2="16.65" y2="16.65"></line></svg>
                Search
              </button>
            </div>

            <!-- Preset Queries -->
            <div class="preset-queries-row">
              <span class="preset-label">Suggestions:</span>
              ${PRESET_QUERIES.map((q) => `
                <button type="button" class="preset-pill" data-preset-query="${escapeHtml(q)}">
                  ${escapeHtml(q)}
                </button>
              `).join("")}
            </div>

            <!-- Search Parameters -->
            <div class="query-controls-row">
              <div class="control-item">
                <div class="control-label-row">
                  <label for="slider-topk" class="control-label">Top-K Results</label>
                  <span class="control-val font-mono" id="val-topk">5</span>
                </div>
                <input type="range" id="slider-topk" min="1" max="15" value="5" step="1" class="slider-control" />
              </div>

              <div class="control-item">
                <div class="control-label-row">
                  <label for="slider-threshold" class="control-label">Similarity Threshold</label>
                  <span class="control-val font-mono" id="val-threshold">0.00</span>
                </div>
                <input type="range" id="slider-threshold" min="-0.2" max="1.0" value="0.0" step="0.05" class="slider-control" />
              </div>

              <div class="control-meta-note">
                <span>Filter: <code>Similarity &ge; Threshold</code></span>
              </div>
            </div>
          </form>
        </div>

        <!-- Dynamic Results Layout -->
        <div id="query-results-wrapper" class="hidden">
          <div class="query-split-grid">
            <!-- Left: 2D PCA Vector Space Scatter Plot -->
            <div class="card visualizer-card">
              <div class="card-header">
                <div>
                  <h3 class="card-title">2D Vector Space Projection</h3>
                  <p class="card-subtitle">Query Star ★ is positioned closest to its primary source embedding</p>
                </div>
              </div>
              <div id="vector-space-container" class="vector-space-box"></div>
            </div>

            <!-- Right: Ranked Top-K Cards -->
            <div class="card results-list-card">
              <div class="card-header">
                <div>
                  <h3 class="card-title">Retrieved Chunks</h3>
                  <p class="card-subtitle" id="results-count-subtitle">Ranked by Cosine Similarity</p>
                </div>
              </div>
              <div class="results-scroll-container" id="results-cards-container"></div>
            </div>
          </div>

          <!-- Bottom: RAG AI Generation & Context Flow -->
          <div class="card rag-answer-card">
            <div class="card-header">
              <div class="rag-header-left">
                <div class="rag-ai-icon">🤖</div>
                <div>
                  <h3 class="card-title">RAG Grounded AI Answer</h3>
                  <span class="model-badge font-mono">Model: openai/gpt-oss-120b</span>
                </div>
              </div>
              <button class="btn btn-xs btn-secondary" id="btn-copy-answer">Copy</button>
            </div>

            <div class="rag-answer-body">
              <div class="answer-text" id="rag-answer-content">Generating answer...</div>
            </div>

            <!-- RAG Pipeline Flow Summary -->
            <div class="rag-flow-breakdown">
              <div class="flow-step">
                <span class="flow-num">1</span>
                <span class="flow-name">Question 384D</span>
              </div>
              <span class="flow-arrow">→</span>
              <div class="flow-step">
                <span class="flow-num">2</span>
                <span class="flow-name" id="rag-flow-topk">HNSW Top 5</span>
              </div>
              <span class="flow-arrow">→</span>
              <div class="flow-step">
                <span class="flow-num">3</span>
                <span class="flow-name" id="rag-flow-thresh">Gate &ge; 0.00</span>
              </div>
              <span class="flow-arrow">→</span>
              <div class="flow-step">
                <span class="flow-num">4</span>
                <span class="flow-name" id="rag-flow-chunks">Context Assembled</span>
              </div>
              <span class="flow-arrow">→</span>
              <div class="flow-step">
                <span class="flow-num">5</span>
                <span class="flow-name">LLM Answer</span>
              </div>
            </div>

            <!-- Retrieved Context Accordion -->
            <div class="rag-context-accordion">
              <button class="accordion-toggle" id="btn-toggle-context">
                <span>View Retrieved Context Payload Sent to LLM</span>
                <span class="accordion-icon" id="context-accordion-icon">▼</span>
              </button>
              <div class="accordion-content hidden" id="rag-context-payload">
                <pre class="context-code-box font-mono" id="context-code-text"></pre>
              </div>
            </div>
          </div>
        </div>

        <!-- Initial Placeholder State -->
        <div id="query-empty-state" class="card empty-query-card">
          <div class="empty-icon">🔍</div>
          <h3 class="empty-title">Ready for Semantic Search</h3>
          <p class="empty-desc">Enter a search query above to execute vector retrieval and observe real-time 384D cosine distances.</p>
        </div>
      </div>
    `

    this.setupEvents()
    await this.loadStoredVectors()

    // Automatically trigger initial search with default query
    this.handleSearch()
  }

  setupEvents() {
    const form = this.container.querySelector("#query-search-form")
    const topkSlider = this.container.querySelector("#slider-topk")
    const topkVal = this.container.querySelector("#val-topk")
    const threshSlider = this.container.querySelector("#slider-threshold")
    const threshVal = this.container.querySelector("#val-threshold")

    topkSlider.addEventListener("input", (e) => {
      topkVal.textContent = e.target.value
    })

    threshSlider.addEventListener("input", (e) => {
      const val = Number(e.target.value).toFixed(2)
      threshVal.textContent = val
      this.applyThresholdLocally(Number(val))
    })

    form.addEventListener("submit", (e) => {
      e.preventDefault()
      this.handleSearch()
    })

    // Preset query clicks
    this.container.querySelectorAll("[data-preset-query]").forEach((btn) => {
      btn.addEventListener("click", () => {
        const queryText = btn.getAttribute("data-preset-query")
        const input = this.container.querySelector("#query-input-text")
        if (input) {
          input.value = queryText
          this.handleSearch()
        }
      })
    })

    // Context accordion
    const toggleContextBtn = this.container.querySelector("#btn-toggle-context")
    const contextPayload = this.container.querySelector("#rag-context-payload")
    const contextIcon = this.container.querySelector("#context-accordion-icon")

    if (toggleContextBtn && contextPayload) {
      toggleContextBtn.addEventListener("click", () => {
        const isHidden = contextPayload.classList.contains("hidden")
        if (isHidden) {
          contextPayload.classList.remove("hidden")
          contextIcon.textContent = "▲"
        } else {
          contextPayload.classList.add("hidden")
          contextIcon.textContent = "▼"
        }
      })
    }

    // Copy answer button
    const copyBtn = this.container.querySelector("#btn-copy-answer")
    if (copyBtn) {
      copyBtn.addEventListener("click", () => {
        const answerText = this.container.querySelector("#rag-answer-content").textContent
        navigator.clipboard.writeText(answerText)
        toast.success("AI Answer copied to clipboard")
      })
    }
  }

  async loadStoredVectors() {
    try {
      const res = await api.getVectors()
      if (res.success && res.data) {
        this.storedVectors = res.data
      }
    } catch (e) {
      console.warn("Could not load stored vectors for background scatter:", e)
    }
  }

  async handleSearch() {
    if (this.isSearching) return

    const questionInput = this.container.querySelector("#query-input-text")
    const topkInput = this.container.querySelector("#slider-topk")
    const threshInput = this.container.querySelector("#slider-threshold")

    const question = questionInput.value.trim()
    const topK = Number(topkInput.value)
    const threshold = Number(threshInput.value)

    if (!question) {
      toast.error("Please enter a question to search")
      return
    }

    this.isSearching = true
    const searchBtn = this.container.querySelector("#btn-run-query")
    searchBtn.disabled = true
    searchBtn.innerHTML = `<span class="spinner-sm"></span> Searching...`

    try {
      const response = await api.queryRAG({ question, topK, threshold })

      if (response.success && response.data) {
        this.lastQueryResult = response.data
        this.renderResults(response.data, question, topK, threshold)
      }
    } catch (err) {
      toast.error(`Query search error: ${err.message}`)
    } finally {
      this.isSearching = false
      searchBtn.disabled = false
      searchBtn.innerHTML = `
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="11" cy="11" r="8"></circle><line x1="21" y1="21" x2="16.65" y2="16.65"></line></svg>
        Search
      `
    }
  }

  renderResults(data, question, topK, threshold) {
    const resultsWrapper = this.container.querySelector("#query-results-wrapper")
    const emptyState = this.container.querySelector("#query-empty-state")

    emptyState.classList.add("hidden")
    resultsWrapper.classList.remove("hidden")

    const results = data.results || []

    // 1. Initialize or Update 2D PCA Visualizer
    const vsContainer = this.container.querySelector("#vector-space-container")
    if (!this.visualizer) {
      this.visualizer = new VectorSpaceVisualizer(vsContainer, (node) => {
        this.openVectorDetailsModal(node)
      })
    }

    this.visualizer.setData({
      queryVector: data.queryVector,
      queryText: question,
      retrievedItems: results,
      storedItems: this.storedVectors,
    })

    // 2. Render Ranked Top-K Cards
    this.renderResultCards(results, threshold)

    // 3. Render AI Answer & Flow Breakdown
    const answerContentEl = this.container.querySelector("#rag-answer-content")
    answerContentEl.innerHTML = escapeHtml(data.answer || "No answer generated.")

    // Flow tags
    const flowTopk = this.container.querySelector("#rag-flow-topk")
    const flowThresh = this.container.querySelector("#rag-flow-thresh")
    const flowChunks = this.container.querySelector("#rag-flow-chunks")

    if (flowTopk) flowTopk.textContent = `HNSW Top ${topK}`
    if (flowThresh) flowThresh.textContent = `Gate ≥ ${threshold.toFixed(2)}`
    const passedCount = results.filter((r) => r.passedThreshold !== false).length
    if (flowChunks) flowChunks.textContent = `${passedCount} Chunks`

    // Context payload
    const contextCodeText = this.container.querySelector("#context-code-text")
    if (contextCodeText) {
      contextCodeText.textContent = data.context || "(No context retrieved above threshold)"
    }
  }

  renderResultCards(results, threshold) {
    const cardsContainer = this.container.querySelector("#results-cards-container")
    const countSubtitle = this.container.querySelector("#results-count-subtitle")
    if (!cardsContainer) return

    if (results.length === 0) {
      cardsContainer.innerHTML = `
        <div class="empty-state-mini">
          <span>No matching vectors found in index.</span>
        </div>
      `
      return
    }

    const passed = results.filter((r) => r.score >= threshold)
    countSubtitle.textContent = `${passed.length} of ${results.length} chunks pass threshold (${threshold.toFixed(2)})`

    cardsContainer.innerHTML = results
      .map((item, index) => {
        const rank = index + 1
        const similarity = item.score !== undefined ? item.score : 0
        const cosDist = item.cosineDistance !== undefined ? item.cosineDistance : 1 - similarity
        const meetsThresh = similarity >= threshold
        const simPercent = Math.max(0, Math.min(100, similarity * 100))

        const docId = item.metadata?.documentId || "--"
        const source = item.metadata?.source || "--"
        const chunkIdx = item.metadata?.chunkIndex !== undefined ? item.metadata.chunkIndex : index
        const text = item.metadata?.text || item.text || ""

        return `
          <div class="result-card ${meetsThresh ? "card-included" : "card-excluded"}" data-result-idx="${index}">
            <div class="result-card-header">
              <div class="result-rank-group">
                <span class="rank-badge ${rank === 1 ? "rank-badge-top" : ""}">#${rank}</span>
                <span class="result-id font-mono">${escapeHtml(item.id)}</span>
              </div>
              <div class="result-score-badge font-mono ${meetsThresh ? "badge-pass" : "badge-fail"}">
                ${formatPercent(similarity)} match
              </div>
            </div>

            <div class="result-metrics-bar-group">
              <div class="similarity-progress-bg">
                <div class="similarity-progress-fill ${rank === 1 ? "fill-top" : ""}" style="width: ${simPercent}%"></div>
              </div>
              <div class="metric-score-row">
                <span>Sim: <strong class="color-emerald font-mono">${formatFloat(similarity, 3)}</strong></span>
                <span>Dist: <strong class="color-indigo font-mono">${formatFloat(cosDist, 3)}</strong></span>
              </div>
            </div>

            <div class="result-text-preview">
              "${escapeHtml(truncateText(text, 120))}"
            </div>

            <div class="result-card-footer">
              <span class="meta-tag font-mono">${escapeHtml(source)} : ${chunkIdx}</span>
              <button class="btn-text btn-inspect-result" data-result-idx="${index}">
                Inspect 384D →
              </button>
            </div>
          </div>
        `
      })
      .join("")

    // Attach inspect buttons
    cardsContainer.querySelectorAll(".btn-inspect-result").forEach((btn) => {
      btn.addEventListener("click", () => {
        const idx = Number(btn.getAttribute("data-result-idx"))
        const item = results[idx]
        if (item) this.openVectorDetailsModal(item)
      })
    })
  }

  applyThresholdLocally(threshold) {
    if (!this.lastQueryResult || !this.lastQueryResult.results) return

    const results = this.lastQueryResult.results.map((r) => ({
      ...r,
      passedThreshold: r.score >= threshold,
    }))

    this.renderResultCards(results, threshold)

    if (this.visualizer) {
      this.visualizer.setData({
        queryVector: this.lastQueryResult.queryVector,
        queryText: this.lastQueryResult.question,
        retrievedItems: results,
        storedItems: this.storedVectors,
      })
    }

    // Update flow tags
    const flowThresh = this.container.querySelector("#rag-flow-thresh")
    const flowChunks = this.container.querySelector("#rag-flow-chunks")
    const passedCount = results.filter((r) => r.passedThreshold).length

    if (flowThresh) flowThresh.textContent = `Gate ≥ ${threshold.toFixed(2)}`
    if (flowChunks) flowChunks.textContent = `${passedCount} Chunks`
  }

  openVectorDetailsModal(item) {
    const vector = item.vector || []
    const firstN = vector.slice(0, 16)
    const sim = item.score !== undefined ? item.score : 0
    const cosDist = item.cosineDistance !== undefined ? item.cosineDistance : 1 - sim

    const content = `
      <div class="vector-details-modal">
        <div class="detail-grid">
          <div class="detail-item">
            <span class="detail-lbl">ID:</span>
            <span class="detail-val font-mono font-bold">${escapeHtml(item.id)}</span>
          </div>
          <div class="detail-item">
            <span class="detail-lbl">Similarity Score:</span>
            <span class="detail-val font-mono color-emerald">${formatFloat(sim, 4)} (${formatPercent(sim)})</span>
          </div>
          <div class="detail-item">
            <span class="detail-lbl">Cosine Distance:</span>
            <span class="detail-val font-mono color-indigo">${formatFloat(cosDist, 4)} (1 - Sim)</span>
          </div>
          <div class="detail-item">
            <span class="detail-lbl">Document:</span>
            <span class="detail-val font-mono">${escapeHtml(item.metadata?.documentId || "--")}</span>
          </div>
        </div>

        ${
          item.metadata?.text || item.text
            ? `
          <div class="detail-text-section">
            <label class="detail-section-title">Retrieved Text Content</label>
            <div class="text-content-box">${escapeHtml(item.metadata?.text || item.text)}</div>
          </div>
        `
            : ""
        }

        <div class="detail-vector-section">
          <label class="detail-section-title">384D Vector Embedding (First ${firstN.length} Dimensions)</label>
          <div class="vector-chips-preview">
            ${firstN.map((v, i) => `<span class="vector-chip font-mono"><span class="chip-idx">[${i}]</span> ${formatFloat(v, 4)}</span>`).join("")}
          </div>
        </div>
      </div>
    `

    modal.open({
      title: `Vector Inspection: ${item.id}`,
      content,
      size: "medium",
      actions: [{ label: "Close", variant: "primary", onClick: () => modal.close() }],
    })
  }
}
