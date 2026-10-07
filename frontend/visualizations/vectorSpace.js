/**
 * VectraDB Explorer - Minimalist 2D Vector Space (PCA Projection)
 *
 * Mathematically projects real 384-dimensional embeddings onto 2D
 * using Principal Component Analysis (PCA) with Cosine Distance Radial Mapping:
 * - ★ Query Star (positioned closest to its primary source embedding)
 * - ● #1 Top Match (connected via luminous emerald beam with match percentage)
 * - ● Top-K Candidates (subtle dashed connections with rank tags)
 * - ○ Stored Background Vectors (soft, muted context dots)
 * - Interactive hover tooltips and node inspection modal
 */

import { PCAProjector } from "../utils/pca.js"
import { formatFloat, formatPercent, truncateText, escapeHtml } from "../utils/formatters.js"

export class VectorSpaceVisualizer {
  constructor(containerElement, onNodeClick = null) {
    this.container = containerElement
    this.onNodeClick = onNodeClick
    this.pca = new PCAProjector()

    this.canvas = null
    this.ctx = null
    this.width = 600
    this.height = 450
    this.dpr = typeof window !== "undefined" ? window.devicePixelRatio || 1 : 1

    // Data state
    this.queryVector = null
    this.queryText = ""
    this.retrievedItems = [] // Top-K results
    this.storedItems = [] // All stored vectors
    this.showBackgroundVectors = true

    // Projected coordinate state
    this.projectedPoints = []
    this.projectedQuery = null

    // Interaction state
    this.hoveredPoint = null
    this.selectedPoint = null
    this.zoom = 1
    this.panX = 0
    this.panY = 0
    this.isDragging = false
    this.dragStartX = 0
    this.dragStartY = 0

    this.init()
  }

  init() {
    this.container.innerHTML = `
      <div class="vector-space-wrapper">
        <div class="canvas-toolbar">
          <div class="canvas-legend">
            <span class="legend-item"><span class="legend-dot dot-query"></span> ★ Query</span>
            <span class="legend-item"><span class="legend-dot dot-top1"></span> ● #1 Top Match</span>
            <span class="legend-item"><span class="legend-dot dot-topk"></span> ● Top-K</span>
            <span class="legend-item"><span class="legend-dot dot-stored"></span> ○ Stored</span>
          </div>
          <div class="canvas-controls">
            <label class="toggle-control" title="Show/hide background database vectors">
              <input type="checkbox" id="toggle-bg-vectors" checked />
              <span>Background</span>
            </label>
            <div class="zoom-btn-group">
              <button class="btn btn-xs btn-secondary" id="btn-zoom-in" title="Zoom In">+</button>
              <button class="btn btn-xs btn-secondary" id="btn-zoom-out" title="Zoom Out">−</button>
              <button class="btn btn-xs btn-secondary" id="btn-zoom-reset" title="Reset View">Reset</button>
            </div>
          </div>
        </div>

        <div class="canvas-viewport" id="canvas-viewport">
          <canvas id="vector-space-canvas"></canvas>
          <div class="canvas-tooltip hidden" id="canvas-tooltip"></div>
          <div class="canvas-info-badge font-mono">384D → 2D PCA Space</div>
        </div>
      </div>
    `

    this.canvas = this.container.querySelector("#vector-space-canvas")
    this.tooltip = this.container.querySelector("#canvas-tooltip")
    this.ctx = this.canvas.getContext("2d")

    this.setupEvents()
    this.resize()
  }

  setupEvents() {
    const viewport = this.container.querySelector("#canvas-viewport")

    // Resize observer
    const ro = new ResizeObserver(() => this.resize())
    ro.observe(viewport)

    // Mouse move for hover & drag
    this.canvas.addEventListener("mousemove", (e) => this.handleMouseMove(e))
    this.canvas.addEventListener("mousedown", (e) => this.handleMouseDown(e))
    window.addEventListener("mouseup", () => this.handleMouseUp())
    this.canvas.addEventListener("mouseleave", () => {
      this.hoveredPoint = null
      this.hideTooltip()
      this.render()
    })

    // Click to view details
    this.canvas.addEventListener("click", (e) => this.handleClick(e))

    // Mouse wheel zoom
    this.canvas.addEventListener("wheel", (e) => {
      e.preventDefault()
      const zoomFactor = e.deltaY < 0 ? 1.12 : 0.88
      this.zoom = Math.max(0.4, Math.min(5, this.zoom * zoomFactor))
      this.render()
    })

    // Controls
    const toggleBg = this.container.querySelector("#toggle-bg-vectors")
    if (toggleBg) {
      toggleBg.addEventListener("change", (e) => {
        this.showBackgroundVectors = e.target.checked
        this.render()
      })
    }

    const btnZoomIn = this.container.querySelector("#btn-zoom-in")
    const btnZoomOut = this.container.querySelector("#btn-zoom-out")
    const btnReset = this.container.querySelector("#btn-zoom-reset")

    if (btnZoomIn) btnZoomIn.addEventListener("click", () => { this.zoom = Math.min(5, this.zoom * 1.25); this.render(); })
    if (btnZoomOut) btnZoomOut.addEventListener("click", () => { this.zoom = Math.max(0.4, this.zoom * 0.8); this.render(); })
    if (btnReset) btnReset.addEventListener("click", () => { this.zoom = 1; this.panX = 0; this.panY = 0; this.render(); })
  }

  resize() {
    const viewport = this.container.querySelector("#canvas-viewport")
    if (!viewport) return
    const rect = viewport.getBoundingClientRect()
    this.width = Math.max(300, rect.width)
    this.height = Math.max(250, rect.height || 420)

    this.dpr = window.devicePixelRatio || 1
    this.canvas.width = this.width * this.dpr
    this.canvas.height = this.height * this.dpr
    this.canvas.style.width = `${this.width}px`
    this.canvas.style.height = `${this.height}px`

    this.ctx.scale(this.dpr, this.dpr)
    this.recomputeProjections()
    this.render()
  }

  setData({ queryVector, queryText = "", retrievedItems = [], storedItems = [] }) {
    this.queryVector = queryVector
    this.queryText = queryText
    this.retrievedItems = retrievedItems || []
    this.storedItems = storedItems || []

    this.recomputeProjections()
    this.render()
  }

  recomputeProjections() {
    if (!this.width || !this.height) return

    // Build items map with flags
    const retrievedMap = new Map()
    this.retrievedItems.forEach((item, index) => {
      retrievedMap.set(item.id, { ...item, rank: index + 1, isRetrieved: true })
    })

    const combinedList = []

    // 1. Add all stored items
    this.storedItems.forEach((stored) => {
      const retrieved = retrievedMap.get(stored.id)
      if (retrieved) {
        combinedList.push(retrieved)
        retrievedMap.delete(stored.id)
      } else {
        combinedList.push({
          ...stored,
          isRetrieved: false,
        })
      }
    })

    // 2. Add any remaining retrieved items not in stored list
    retrievedMap.forEach((retrieved) => {
      combinedList.push(retrieved)
    })

    // Execute PCA 2D Projection
    const viewportConfig = {
      width: this.width,
      height: this.height,
      padding: 60,
    }

    const { points, queryPoint } = this.pca.projectToViewport(
      combinedList,
      this.queryVector,
      viewportConfig,
    )

    this.projectedPoints = points
    this.projectedQuery = queryPoint
  }

  render() {
    if (!this.ctx) return
    const ctx = this.ctx
    const w = this.width
    const h = this.height

    ctx.save()
    ctx.clearRect(0, 0, w, h)

    // Minimalist background
    this.drawMinimalBackground(ctx, w, h)

    // Apply pan and zoom
    ctx.translate(w / 2 + this.panX, h / 2 + this.panY)
    ctx.scale(this.zoom, this.zoom)
    ctx.translate(-w / 2, -h / 2)

    // 1. Draw subtle concentric distance guides around Query Star (Clean & Faint)
    if (this.projectedQuery) {
      const q = this.projectedQuery
      const guides = [
        { r: 65, color: "rgba(16, 185, 129, 0.08)" },
        { r: 135, color: "rgba(99, 102, 241, 0.06)" },
        { r: 210, color: "rgba(148, 163, 184, 0.04)" },
      ]

      guides.forEach((guide) => {
        ctx.beginPath()
        ctx.setLineDash([4, 6])
        ctx.strokeStyle = guide.color
        ctx.lineWidth = 1
        ctx.arc(q.x, q.y, guide.r, 0, Math.PI * 2)
        ctx.stroke()
        ctx.setLineDash([])
      })
    }

    // 2. Draw Stored Background Vectors (Subtle, non-distracting dots)
    if (this.showBackgroundVectors) {
      this.projectedPoints.forEach((p) => {
        if (!p.isRetrieved) {
          ctx.beginPath()
          ctx.arc(p.x, p.y, 3.5, 0, Math.PI * 2)
          ctx.fillStyle = "rgba(148, 163, 184, 0.28)"
          ctx.fill()
        }
      })
    }

    // 3. Draw Retrieval Connection Beams
    if (this.projectedQuery) {
      const q = this.projectedQuery

      // Draw secondary candidates first (subtle dashed lines)
      this.projectedPoints.forEach((p) => {
        if (p.isRetrieved && p.rank > 1) {
          const isHovered = this.hoveredPoint === p
          ctx.beginPath()
          ctx.setLineDash([3, 4])
          ctx.strokeStyle = isHovered ? "rgba(99, 102, 241, 0.85)" : "rgba(99, 102, 241, 0.35)"
          ctx.lineWidth = isHovered ? 2 : 1.2
          ctx.moveTo(q.x, q.y)
          ctx.lineTo(p.x, p.y)
          ctx.stroke()
          ctx.setLineDash([])
        }
      })

      // Draw Rank #1 Primary Source Beam (Prominent & Luminous)
      const top1 = this.projectedPoints.find((p) => p.isRetrieved && p.rank === 1)
      if (top1) {
        // Soft aura line
        ctx.beginPath()
        ctx.strokeStyle = "rgba(16, 185, 129, 0.2)"
        ctx.lineWidth = 6
        ctx.moveTo(q.x, q.y)
        ctx.lineTo(top1.x, top1.y)
        ctx.stroke()

        // Solid beam line
        ctx.beginPath()
        ctx.strokeStyle = "#10b981"
        ctx.lineWidth = 2.2
        ctx.moveTo(q.x, q.y)
        ctx.lineTo(top1.x, top1.y)
        ctx.stroke()

        // Clean midpoint match badge on primary beam
        const midX = (q.x + top1.x) / 2
        const midY = (q.y + top1.y) / 2
        const sim = top1.score !== undefined ? top1.score : 0
        const badgeText = `${formatPercent(sim)} Match`

        ctx.font = "bold 9px 'JetBrains Mono', monospace"
        const textWidth = ctx.measureText(badgeText).width
        const padX = 6
        const padY = 3
        const badgeW = textWidth + padX * 2
        const badgeH = 16

        // Rounded pill background
        ctx.fillStyle = "rgba(6, 78, 59, 0.92)"
        ctx.strokeStyle = "rgba(16, 185, 129, 0.75)"
        ctx.lineWidth = 1
        this.roundRect(ctx, midX - badgeW / 2, midY - badgeH / 2, badgeW, badgeH, 8, true, true)

        ctx.fillStyle = "#6ee7b7"
        ctx.textAlign = "center"
        ctx.textBaseline = "middle"
        ctx.fillText(badgeText, midX, midY)
      }
    }

    // 4. Draw Top-K Candidate Nodes
    this.projectedPoints.forEach((p) => {
      if (p.isRetrieved) {
        const isTop1 = p.rank === 1
        const isHovered = this.hoveredPoint === p
        const radius = isTop1 ? (isHovered ? 9 : 7.5) : (isHovered ? 7.5 : 6)

        if (isTop1) {
          // #1 Top Source Node (Glowing Emerald)
          ctx.beginPath()
          ctx.arc(p.x, p.y, radius + 5, 0, Math.PI * 2)
          ctx.fillStyle = "rgba(16, 185, 129, 0.25)"
          ctx.fill()

          ctx.beginPath()
          ctx.arc(p.x, p.y, radius, 0, Math.PI * 2)
          ctx.fillStyle = "#10b981"
          ctx.fill()
          ctx.strokeStyle = "#ffffff"
          ctx.lineWidth = 2
          ctx.stroke()

          // Sleek #1 label
          ctx.fillStyle = "#a7f3d0"
          ctx.font = "bold 10px 'Inter', sans-serif"
          ctx.textAlign = "center"
          ctx.textBaseline = "bottom"
          ctx.fillText("#1 Source", p.x, p.y - radius - 4)
        } else {
          // Other Top-K Nodes (Cyan / Indigo)
          ctx.beginPath()
          ctx.arc(p.x, p.y, radius + 3, 0, Math.PI * 2)
          ctx.fillStyle = "rgba(99, 102, 241, 0.18)"
          ctx.fill()

          ctx.beginPath()
          ctx.arc(p.x, p.y, radius, 0, Math.PI * 2)
          ctx.fillStyle = "#6366f1"
          ctx.fill()
          ctx.strokeStyle = "#ffffff"
          ctx.lineWidth = 1.4
          ctx.stroke()

          // Clean small rank number
          ctx.fillStyle = "#cbd5e1"
          ctx.font = "600 9px 'JetBrains Mono', monospace"
          ctx.textAlign = "center"
          ctx.textBaseline = "bottom"
          ctx.fillText(`#${p.rank}`, p.x, p.y - radius - 3)
        }
      }
    })

    // 5. Draw ★ Query Star (Clean, Beautiful, Amber Glow)
    if (this.projectedQuery) {
      const q = this.projectedQuery
      const qRadius = 11

      // Soft amber glow
      ctx.beginPath()
      ctx.arc(q.x, q.y, qRadius + 7, 0, Math.PI * 2)
      ctx.fillStyle = "rgba(245, 158, 11, 0.2)"
      ctx.fill()

      // 5-Pointed Star
      ctx.beginPath()
      this.drawStar(ctx, q.x, q.y, 5, qRadius, qRadius / 2)
      ctx.fillStyle = "#f59e0b"
      ctx.fill()
      ctx.strokeStyle = "#ffffff"
      ctx.lineWidth = 2
      ctx.stroke()

      // Clean Query Tag
      ctx.fillStyle = "#fcd34d"
      ctx.font = "bold 10px 'Inter', sans-serif"
      ctx.textAlign = "center"
      ctx.textBaseline = "top"
      ctx.fillText("★ Query", q.x, q.y + qRadius + 4)
    }

    ctx.restore()
  }

  drawMinimalBackground(ctx, w, h) {
    // Subtle crosshair lines through canvas center
    const cx = w / 2
    const cy = h / 2

    ctx.strokeStyle = "rgba(255, 255, 255, 0.03)"
    ctx.lineWidth = 1

    ctx.beginPath()
    ctx.moveTo(0, cy)
    ctx.lineTo(w, cy)
    ctx.stroke()

    ctx.beginPath()
    ctx.moveTo(cx, 0)
    ctx.lineTo(cx, h)
    ctx.stroke()
  }

  drawStar(ctx, cx, cy, spikes, outerRadius, innerRadius) {
    let rot = (Math.PI / 2) * 3
    let x = cx
    let y = cy
    const step = Math.PI / spikes

    ctx.beginPath()
    ctx.moveTo(cx, cy - outerRadius)
    for (let i = 0; i < spikes; i++) {
      x = cx + Math.cos(rot) * outerRadius
      y = cy + Math.sin(rot) * outerRadius
      ctx.lineTo(x, y)
      rot += step

      x = cx + Math.cos(rot) * innerRadius
      y = cy + Math.sin(rot) * innerRadius
      ctx.lineTo(x, y)
      rot += step
    }
    ctx.lineTo(cx, cy - outerRadius)
    ctx.closePath()
  }

  roundRect(ctx, x, y, width, height, radius, fill, stroke) {
    if (typeof radius === "undefined") radius = 5
    ctx.beginPath()
    ctx.moveTo(x + radius, y)
    ctx.lineTo(x + width - radius, y)
    ctx.quadraticCurveTo(x + width, y, x + width, y + radius)
    ctx.lineTo(x + width, y + height - radius)
    ctx.quadraticCurveTo(x + width, y + height, x + width - radius, y + height)
    ctx.lineTo(x + radius, y + height)
    ctx.quadraticCurveTo(x, y + height, x, y + height - radius)
    ctx.lineTo(x, y + radius)
    ctx.quadraticCurveTo(x, y, x + radius, y)
    ctx.closePath()
    if (fill) ctx.fill()
    if (stroke) ctx.stroke()
  }

  screenToWorld(screenX, screenY) {
    const w = this.width
    const h = this.height
    const centeredX = screenX - (w / 2 + this.panX)
    const centeredY = screenY - (h / 2 + this.panY)
    const unscaledX = centeredX / this.zoom
    const unscaledY = centeredY / this.zoom
    return {
      x: unscaledX + w / 2,
      y: unscaledY + h / 2,
    }
  }

  handleMouseDown(e) {
    this.isDragging = true
    this.dragStartX = e.clientX - this.panX
    this.dragStartY = e.clientY - this.panY
  }

  handleMouseMove(e) {
    const rect = this.canvas.getBoundingClientRect()
    const mouseX = e.clientX - rect.left
    const mouseY = e.clientY - rect.top

    if (this.isDragging) {
      this.panX = e.clientX - this.dragStartX
      this.panY = e.clientY - this.dragStartY
      this.render()
      return
    }

    const world = this.screenToWorld(mouseX, mouseY)

    // Check query point hover
    if (this.projectedQuery) {
      const qd = Math.hypot(world.x - this.projectedQuery.x, world.y - this.projectedQuery.y)
      if (qd < 15 / this.zoom) {
        this.hoveredPoint = { isQuery: true }
        this.showTooltip(e.clientX, e.clientY, {
          isQuery: true,
          queryText: this.queryText,
        })
        this.render()
        return
      }
    }

    // Check node points hover
    let found = null
    for (const p of this.projectedPoints) {
      if (!this.showBackgroundVectors && !p.isRetrieved) continue
      const dist = Math.hypot(world.x - p.x, world.y - p.y)
      const hitRadius = (p.isRetrieved ? 12 : 7) / this.zoom
      if (dist < hitRadius) {
        found = p
        break
      }
    }

    if (found) {
      this.hoveredPoint = found
      this.canvas.style.cursor = "pointer"
      this.showTooltip(e.clientX, e.clientY, found)
    } else {
      this.hoveredPoint = null
      this.canvas.style.cursor = this.isDragging ? "grabbing" : "grab"
      this.hideTooltip()
    }
    this.render()
  }

  handleMouseUp() {
    this.isDragging = false
  }

  handleClick(e) {
    if (this.hoveredPoint && !this.hoveredPoint.isQuery && this.onNodeClick) {
      this.onNodeClick(this.hoveredPoint)
    }
  }

  showTooltip(clientX, clientY, data) {
    if (!this.tooltip) return
    const rect = this.container.getBoundingClientRect()
    const left = clientX - rect.left + 15
    const top = clientY - rect.top + 15

    let html = ""
    if (data.isQuery) {
      html = `
        <div class="tooltip-header">
          <span class="tooltip-badge badge-amber">★ QUERY VECTOR</span>
        </div>
        <div class="tooltip-text">"${escapeHtml(data.queryText || "Search Query")}"</div>
        <div class="tooltip-meta font-mono">Dimension: 384D Dense Vector</div>
      `
    } else {
      const sim = data.score !== undefined ? data.score : 0
      const cosDist = data.cosineDistance !== undefined ? data.cosineDistance : 1 - sim
      const docId = data.metadata?.documentId || "--"
      const src = data.metadata?.source || "--"
      const chunkIdx = data.metadata?.chunkIndex !== undefined ? data.metadata.chunkIndex : "--"
      const text = data.metadata?.text || data.text || ""

      html = `
        <div class="tooltip-header">
          <span class="tooltip-title font-mono">${escapeHtml(data.id)}</span>
          ${data.isRetrieved ? `<span class="tooltip-badge badge-emerald">Rank #${data.rank || 1}</span>` : `<span class="tooltip-badge">Stored</span>`}
        </div>
        ${
          data.isRetrieved
            ? `
          <div class="tooltip-metric-row">
            <div class="metric-item">
              <span class="metric-lbl">Cosine Similarity</span>
              <span class="metric-val color-emerald font-mono">${formatFloat(sim, 4)} (${formatPercent(sim)})</span>
            </div>
            <div class="metric-item">
              <span class="metric-lbl">Cosine Distance</span>
              <span class="metric-val color-indigo font-mono">${formatFloat(cosDist, 4)}</span>
            </div>
          </div>
        `
            : ""
        }
        <div class="tooltip-meta">
          <span><strong>Doc:</strong> ${escapeHtml(docId)}</span>
          <span><strong>Source:</strong> ${escapeHtml(src)} (Chunk ${chunkIdx})</span>
        </div>
        ${text ? `<div class="tooltip-preview">"${escapeHtml(truncateText(text, 100))}"</div>` : ""}
        <div class="tooltip-hint">Click point to view 384D vector</div>
      `
    }

    this.tooltip.innerHTML = html
    this.tooltip.style.left = `${Math.min(left, this.width - 240)}px`
    this.tooltip.style.top = `${Math.min(top, this.height - 170)}px`
    this.tooltip.classList.remove("hidden")
  }

  hideTooltip() {
    if (this.tooltip) {
      this.tooltip.classList.add("hidden")
    }
  }
}
