/**
 * VectraDB Explorer - Dedicated RAG Pipeline Playground Page
 *
 * Detailed step-by-step visual dissection of every stage:
 * 1. Question Input
 * 2. 384D Query Embedding
 * 3. HNSW Multi-Layer ANN Search
 * 4. Relevance Threshold Gate
 * 5. Context Builder Assembly
 * 6. Prompt Engineering Template
 * 7. Groq LLM Inference
 * 8. Grounded AI Response
 */

import { api } from "../api.js"
import { toast } from "../components/toast.js"
import { formatFloat, formatPercent, formatVectorPreview, escapeHtml } from "../utils/formatters.js"

export class RAGPage {
  constructor(container) {
    this.container = container
    this.isExecuting = false
  }

  async render() {
    this.container.innerHTML = `
      <div class="page-container fade-in">
        <div class="page-header">
          <div>
            <h1 class="page-title">RAG Pipeline Dissection</h1>
            <p class="page-subtitle">Inspect the inner workings and data payloads of every stage in Retrieval-Augmented Generation</p>
          </div>
        </div>

        <!-- Query Form Bar -->
        <div class="card rag-input-card">
          <form id="rag-exec-form" class="rag-form">
            <div class="query-bar-wrapper">
              <input type="text" id="rag-question-input" class="query-input-field" placeholder="Enter query for RAG pipeline (e.g. What is React used for?)..." value="What is React used for?" required />
              <button type="submit" class="btn btn-primary" id="btn-exec-rag">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polygon points="5 3 19 12 5 21 5 3"></polygon></svg>
                Execute Pipeline
              </button>
            </div>

            <div class="rag-params-row">
              <div class="param-inline">
                <label>Top-K Retrieval:</label>
                <input type="number" id="rag-topk" class="input-sm font-mono" value="5" min="1" max="15" />
              </div>
              <div class="param-inline">
                <label>Relevance Threshold:</label>
                <input type="number" id="rag-threshold" class="input-sm font-mono" value="0.0" min="-0.2" max="1.0" step="0.05" />
              </div>
              <div class="param-inline">
                <label>LLM Model:</label>
                <span class="font-mono text-highlight">openai/gpt-oss-120b</span>
              </div>
            </div>
          </form>
        </div>

        <!-- Dissected Pipeline Steps Stack -->
        <div class="pipeline-dissect-stack" id="rag-dissect-stack">
          <!-- Stage 1: Question -->
          <div class="dissect-stage-card" id="stage-card-1">
            <div class="dissect-stage-header">
              <div class="stage-num-badge">STAGE 1</div>
              <div class="stage-meta">
                <h4 class="stage-title">User Question Ingestion</h4>
                <span class="stage-sub">Validates query string format and length</span>
              </div>
              <div class="stage-state-tag" id="tag-stage-1">Pending</div>
            </div>
            <div class="dissect-stage-body" id="body-stage-1">
              <div class="text-muted">Awaiting pipeline execution...</div>
            </div>
          </div>

          <!-- Stage 2: Embedding -->
          <div class="dissect-stage-card" id="stage-card-2">
            <div class="dissect-stage-header">
              <div class="stage-num-badge">STAGE 2</div>
              <div class="stage-meta">
                <h4 class="stage-title">Query Embedding Generation</h4>
                <span class="stage-sub">Local Transformer: Xenova/multilingual-e5-small (384 Dimensions)</span>
              </div>
              <div class="stage-state-tag" id="tag-stage-2">Pending</div>
            </div>
            <div class="dissect-stage-body" id="body-stage-2">
              <div class="text-muted">Awaiting embedding generation...</div>
            </div>
          </div>

          <!-- Stage 3: HNSW Retrieval -->
          <div class="dissect-stage-card" id="stage-card-3">
            <div class="dissect-stage-header">
              <div class="stage-num-badge">STAGE 3</div>
              <div class="stage-meta">
                <h4 class="stage-title">HNSW Graph Traversal & Search</h4>
                <span class="stage-sub">Multi-layer greedy routing + Layer 0 efSearch exploration</span>
              </div>
              <div class="stage-state-tag" id="tag-stage-3">Pending</div>
            </div>
            <div class="dissect-stage-body" id="body-stage-3">
              <div class="text-muted">Awaiting HNSW graph traversal...</div>
            </div>
          </div>

          <!-- Stage 4: Relevance Threshold -->
          <div class="dissect-stage-card" id="stage-card-4">
            <div class="dissect-stage-header">
              <div class="stage-num-badge">STAGE 4</div>
              <div class="stage-meta">
                <h4 class="stage-title">Relevance Threshold Gate</h4>
                <span class="stage-sub">Filters out noise and hallucinations (Cosine Similarity &ge; Threshold)</span>
              </div>
              <div class="stage-state-tag" id="tag-stage-4">Pending</div>
            </div>
            <div class="dissect-stage-body" id="body-stage-4">
              <div class="text-muted">Awaiting threshold filtering...</div>
            </div>
          </div>

          <!-- Stage 5: Context Builder -->
          <div class="dissect-stage-card" id="stage-card-5">
            <div class="dissect-stage-header">
              <div class="stage-num-badge">STAGE 5</div>
              <div class="stage-meta">
                <h4 class="stage-title">RAG Context Assembly</h4>
                <span class="stage-sub">Formats retrieved chunk evidence into a structured prompt context</span>
              </div>
              <div class="stage-state-tag" id="tag-stage-5">Pending</div>
            </div>
            <div class="dissect-stage-body" id="body-stage-5">
              <div class="text-muted">Awaiting context assembly...</div>
            </div>
          </div>

          <!-- Stage 6: Prompt Engineering -->
          <div class="dissect-stage-card" id="stage-card-6">
            <div class="dissect-stage-header">
              <div class="stage-num-badge">STAGE 6</div>
              <div class="stage-meta">
                <h4 class="stage-title">Prompt Template Construction</h4>
                <span class="stage-sub">Injects system grounding rules and safety constraints</span>
              </div>
              <div class="stage-state-tag" id="tag-stage-6">Pending</div>
            </div>
            <div class="dissect-stage-body" id="body-stage-6">
              <div class="text-muted">Awaiting prompt construction...</div>
            </div>
          </div>

          <!-- Stage 7: Groq LLM Generation -->
          <div class="dissect-stage-card" id="stage-card-7">
            <div class="dissect-stage-header">
              <div class="stage-num-badge">STAGE 7</div>
              <div class="stage-meta">
                <h4 class="stage-title">Groq LLM Inference & Answer</h4>
                <span class="stage-sub">Generates strictly grounded answer based exclusively on provided context</span>
              </div>
              <div class="stage-state-tag" id="tag-stage-7">Pending</div>
            </div>
            <div class="dissect-stage-body" id="body-stage-7">
              <div class="text-muted">Awaiting LLM response...</div>
            </div>
          </div>
        </div>
      </div>
    `

    this.setupEvents()
    // Auto execute default query
    this.executePipeline()
  }

  setupEvents() {
    const form = this.container.querySelector("#rag-exec-form")
    form.addEventListener("submit", (e) => {
      e.preventDefault()
      this.executePipeline()
    })
  }

  async executePipeline() {
    if (this.isExecuting) return

    const question = this.container.querySelector("#rag-question-input").value.trim()
    const topK = Number(this.container.querySelector("#rag-topk").value) || 5
    const threshold = Number(this.container.querySelector("#rag-threshold").value) || 0

    if (!question) {
      toast.error("Please enter a question")
      return
    }

    this.isExecuting = true
    const btn = this.container.querySelector("#btn-exec-rag")
    btn.disabled = true
    btn.innerHTML = `<span class="spinner-sm"></span> Executing...`

    // Reset stages
    for (let i = 1; i <= 7; i++) {
      const tag = this.container.querySelector(`#tag-stage-${i}`)
      if (tag) {
        tag.textContent = "Processing..."
        tag.className = "stage-state-tag tag-running"
      }
    }

    try {
      // Stage 1
      const body1 = this.container.querySelector("#body-stage-1")
      const tag1 = this.container.querySelector("#tag-stage-1")
      body1.innerHTML = `
        <div class="payload-box">
          <span class="payload-lbl">Raw Question:</span>
          <span class="font-bold">"${escapeHtml(question)}"</span>
          <span class="text-muted text-xs font-mono">(${question.length} chars)</span>
        </div>
      `
      tag1.textContent = "Done ✓"
      tag1.className = "stage-state-tag tag-success"

      // Call API
      const res = await api.queryRAG({ question, topK, threshold })
      const data = res.data || {}

      // Stage 2: Embedding
      const body2 = this.container.querySelector("#body-stage-2")
      const tag2 = this.container.querySelector("#tag-stage-2")
      const qVector = data.queryVector || []
      body2.innerHTML = `
        <div class="payload-box">
          <div class="spec-row">
            <span><strong>Model:</strong> Xenova/multilingual-e5-small</span>
            <span><strong>Prefix:</strong> <code>query: ${escapeHtml(question)}</code></span>
            <span><strong>Vector Dimension:</strong> ${qVector.length || 384} Float32 Numbers</span>
          </div>
          <div class="vector-preview-box font-mono">
            ${formatVectorPreview(qVector, 10)}
          </div>
        </div>
      `
      tag2.textContent = "Done ✓"
      tag2.className = "stage-state-tag tag-success"

      // Stage 3: Retrieval
      const body3 = this.container.querySelector("#body-stage-3")
      const tag3 = this.container.querySelector("#tag-stage-3")
      const results = data.results || []
      body3.innerHTML = `
        <div class="payload-box">
          <div class="spec-row">
            <span><strong>Requested Top-K:</strong> ${topK}</span>
            <span><strong>Candidates Found:</strong> ${results.length}</span>
            <span><strong>HNSW efSearch:</strong> 50</span>
          </div>
          <div class="retrieved-items-chips">
            ${results.map((r, i) => `
              <span class="retrieved-chip font-mono">
                #${i + 1} <strong>${escapeHtml(r.id)}</strong> (Sim: ${formatFloat(r.score, 4)}, Dist: ${formatFloat(r.cosineDistance, 4)})
              </span>
            `).join("")}
          </div>
        </div>
      `
      tag3.textContent = "Done ✓"
      tag3.className = "stage-state-tag tag-success"

      // Stage 4: Threshold Gate
      const body4 = this.container.querySelector("#body-stage-4")
      const tag4 = this.container.querySelector("#tag-stage-4")
      const passedResults = results.filter((r) => r.score >= threshold)
      body4.innerHTML = `
        <div class="payload-box">
          <div class="spec-row">
            <span><strong>Threshold Filter:</strong> &ge; ${threshold.toFixed(2)}</span>
            <span><strong>Retained Chunks:</strong> <strong class="color-emerald">${passedResults.length}</strong> of ${results.length}</span>
          </div>
          <div class="threshold-results-summary">
            ${results.map((r) => {
              const pass = r.score >= threshold
              return `
                <div class="thresh-item ${pass ? "pass" : "fail"}">
                  <span class="thresh-icon">${pass ? "✓" : "✕"}</span>
                  <span class="font-mono">${escapeHtml(r.id)}</span>
                  <span class="font-mono text-xs">Score: ${formatFloat(r.score, 4)}</span>
                </div>
              `
            }).join("")}
          </div>
        </div>
      `
      tag4.textContent = "Done ✓"
      tag4.className = "stage-state-tag tag-success"

      // Stage 5: Context Builder
      const body5 = this.container.querySelector("#body-stage-5")
      const tag5 = this.container.querySelector("#tag-stage-5")
      body5.innerHTML = `
        <div class="payload-box">
          <label class="payload-lbl">Formatted Context Text:</label>
          <pre class="context-code-box font-mono">${escapeHtml(data.context || "(No context available)")}</pre>
        </div>
      `
      tag5.textContent = "Done ✓"
      tag5.className = "stage-state-tag tag-success"

      // Stage 6: Prompt Builder
      const body6 = this.container.querySelector("#body-stage-6")
      const tag6 = this.container.querySelector("#tag-stage-6")
      const promptTemplate = `Answer the question based ONLY on the following context. If you don't know the answer, say "I don't have enough information in the provided context."

Context:
${data.context || "(No context)"}

Question: ${question}

Answer:`

      body6.innerHTML = `
        <div class="payload-box">
          <label class="payload-lbl">Complete Prompt Payload sent to LLM:</label>
          <pre class="prompt-code-box font-mono">${escapeHtml(promptTemplate)}</pre>
        </div>
      `
      tag6.textContent = "Done ✓"
      tag6.className = "stage-state-tag tag-success"

      // Stage 7: LLM Answer
      const body7 = this.container.querySelector("#body-stage-7")
      const tag7 = this.container.querySelector("#tag-stage-7")
      body7.innerHTML = `
        <div class="payload-box">
          <div class="spec-row">
            <span><strong>Model:</strong> openai/gpt-oss-120b</span>
            <span><strong>Temperature:</strong> 0.0</span>
          </div>
          <div class="final-answer-display">
            ${escapeHtml(data.answer || "No response generated")}
          </div>
        </div>
      `
      tag7.textContent = "Done ✓"
      tag7.className = "stage-state-tag tag-success"

      toast.success("RAG Pipeline completed")
    } catch (err) {
      toast.error(`Pipeline error: ${err.message}`)
    } finally {
      this.isExecuting = false
      btn.disabled = false
      btn.innerHTML = `
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polygon points="5 3 19 12 5 21 5 3"></polygon></svg>
        Execute Pipeline
      `
    }
  }
}
