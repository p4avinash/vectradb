/**
 * VectraDB Explorer - HNSW Graph Page (Minimalist & Clean)
 */

import { api } from "../api.js"
import { HNSWGraphVisualizer } from "../visualizations/hnswGraph.js"
import { toast } from "../components/toast.js"
import { formatFloat, truncateText, escapeHtml, formatJson } from "../utils/formatters.js"

export class HNSWPage {
  constructor(container) {
    this.container = container
    this.visualizer = null
    this.graphData = null
    this.selectedNode = null
  }

  async render() {
    this.container.innerHTML = `
      <div class="page-container fade-in">
        <div class="page-header">
          <div>
            <h1 class="page-title">HNSW Graph</h1>
            <p class="page-subtitle">Hierarchical multi-layer graph topology & logarithmic search traversal</p>
          </div>
          <div class="header-actions">
            <!-- Compact Config Pills -->
            <div class="hnsw-pill-bar">
              <span class="hnsw-mini-pill font-mono">M = 8</span>
              <span class="hnsw-mini-pill font-mono">efC = 100</span>
              <span class="hnsw-mini-pill font-mono">efS = 50</span>
            </div>
            <button class="btn btn-secondary btn-sm" id="btn-refresh-hnsw">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="23 4 23 10 17 10"></polyline><polyline points="1 20 1 14 7 14"></polyline><path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15"></path></svg>
              Refresh
            </button>
          </div>
        </div>

        <!-- Interactive Visualizer & Inspector Grid -->
        <div class="hnsw-split-grid">
          <!-- Canvas Visualizer Card -->
          <div class="card hnsw-canvas-card">
            <div class="card-header">
              <div>
                <h3 class="card-title">Multi-Layer Graph Canvas</h3>
                <p class="card-subtitle">Real node connections and multi-plane layer skip-lists</p>
              </div>
              <div class="hnsw-stats-pills font-mono" id="hnsw-header-stats">
                Loading...
              </div>
            </div>

            <div id="hnsw-canvas-container" class="hnsw-canvas-container">
              <div class="loading-state">
                <div class="spinner"></div>
                <span>Fetching graph topology...</span>
              </div>
            </div>
          </div>

          <!-- Node Inspector Side Panel -->
          <div class="card hnsw-inspector-card">
            <div class="card-header">
              <h3 class="card-title">Node Inspector</h3>
              <span class="badge-dim" id="inspector-status-badge">Select Node</span>
            </div>

            <div class="inspector-body" id="hnsw-inspector-body">
              <div class="empty-state-mini">
                <span>Click or hover any node in the graph to inspect connections and metadata.</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    `

    this.setupEvents()
    await this.loadGraphData()
  }

  setupEvents() {
    const refreshBtn = this.container.querySelector("#btn-refresh-hnsw")
    if (refreshBtn) {
      refreshBtn.addEventListener("click", () => this.loadGraphData())
    }
  }

  async loadGraphData() {
    try {
      const res = await api.getHNSWGraph()
      if (res.success && res.data) {
        this.graphData = res.data
        this.renderGraph()
        toast.success(`HNSW Graph loaded: ${res.data.size} nodes`)
      }
    } catch (err) {
      const container = this.container.querySelector("#hnsw-canvas-container")
      if (container) {
        container.innerHTML = `
          <div class="error-banner">
            <strong>Failed to load HNSW graph:</strong> ${escapeHtml(err.message)}
          </div>
        `
      }
      toast.error(`HNSW graph error: ${err.message}`)
    }
  }

  renderGraph() {
    const container = this.container.querySelector("#hnsw-canvas-container")
    const headerStats = this.container.querySelector("#hnsw-header-stats")
    if (!container || !this.graphData) return

    if (!this.visualizer) {
      this.visualizer = new HNSWGraphVisualizer(container, (nodePos) => {
        this.inspectNode(nodePos)
      })
    }

    this.visualizer.setGraphData(this.graphData)

    if (headerStats) {
      headerStats.innerHTML = `
        <span>Nodes: <strong>${this.graphData.size}</strong></span> |
        <span>Max Level: <strong>${this.graphData.maxLevel}</strong></span> |
        <span>Entry: <strong>${escapeHtml(this.graphData.entryPoint || "None")}</strong></span>
      `
    }

    // Default select entry point node if exists
    if (this.graphData.entryPoint) {
      const entryNode = this.graphData.nodes?.find((n) => n.id === this.graphData.entryPoint)
      if (entryNode) {
        this.inspectNode({
          id: entryNode.id,
          level: entryNode.level,
          currentLayer: entryNode.level,
          rawNode: entryNode,
          isEntryPoint: true,
        })
      }
    }
  }

  inspectNode(nodePos) {
    const inspectorBody = this.container.querySelector("#hnsw-inspector-body")
    const badge = this.container.querySelector("#inspector-status-badge")
    if (!inspectorBody || !nodePos) return

    const node = nodePos.rawNode || nodePos
    const isEntry = node.id === this.graphData?.entryPoint

    if (badge) {
      badge.textContent = isEntry ? "★ Entry Point" : `Layer ${node.level} Node`
      badge.className = isEntry ? "badge-dim badge-amber" : "badge-dim"
    }

    const neighborsObj = node.neighbors || {}
    const layerEntries = Object.entries(neighborsObj)

    inspectorBody.innerHTML = `
      <div class="inspector-content fade-in">
        <div class="inspector-item">
          <span class="inspector-lbl">Node ID:</span>
          <span class="inspector-val font-mono font-bold text-highlight">${escapeHtml(node.id)}</span>
        </div>

        <div class="inspector-item">
          <span class="inspector-lbl">Assigned Max Level:</span>
          <span class="inspector-val font-mono color-cyan">Level ${node.level}</span>
        </div>

        <div class="inspector-item">
          <span class="inspector-lbl">Vector Dimension:</span>
          <span class="inspector-val font-mono">384 Dimensions</span>
        </div>

        <div class="inspector-item">
          <span class="inspector-lbl">Entry Point Status:</span>
          <span class="inspector-val font-mono">${isEntry ? "<strong class='color-amber'>★ Active Global Entry Point</strong>" : "Standard Node"}</span>
        </div>

        <!-- Layer-by-Layer Neighbors -->
        <div class="inspector-section">
          <label class="inspector-section-title">Connections per Layer</label>
          <div class="layers-list">
            ${
              layerEntries.length > 0
                ? layerEntries
                    .map(
                      ([lvl, nbrs]) => `
                    <div class="layer-conn-card">
                      <div class="layer-conn-header">
                        <span class="layer-tag">Layer ${lvl}</span>
                        <span class="layer-count font-mono">${nbrs ? nbrs.length : 0} neighbors</span>
                      </div>
                      <div class="layer-nbr-chips">
                        ${
                          nbrs && nbrs.length > 0
                            ? nbrs.map((nbrId) => `<span class="nbr-chip font-mono" title="${escapeHtml(nbrId)}">${escapeHtml(truncateText(nbrId, 16))}</span>`).join("")
                            : `<span class="text-muted text-xs">No edges at this level</span>`
                        }
                      </div>
                    </div>
                  `,
                    )
                    .join("")
                : `<div class="text-muted text-xs">No layer connections recorded</div>`
            }
          </div>
        </div>

        ${
          node.metadata?.text
            ? `
          <div class="inspector-section">
            <label class="inspector-section-title">Stored Text Content</label>
            <div class="inspector-text-box">"${escapeHtml(node.metadata.text)}"</div>
          </div>
        `
            : ""
        }

        <div class="inspector-section">
          <label class="inspector-section-title">Metadata</label>
          <pre class="inspector-json-box font-mono">${escapeHtml(formatJson(node.metadata || {}))}</pre>
        </div>
      </div>
    `
  }
}
