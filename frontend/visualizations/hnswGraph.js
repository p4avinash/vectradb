/**
 * VectraDB Explorer - Real HNSW Multi-Layer Graph Visualizer
 *
 * Visualizes the real Hierarchical Navigable Small World graph:
 * - Layer Selector (All Layers / Layer 0 / Layer 1 / Layer 2 ...)
 * - Stacked 2.5D Layer Planes or 2D Layer-by-Layer exploration
 * - Entry Point glow & badge
 * - Real edges computed from neighbor adjacency lists
 * - Interactive Pan, Zoom, Hover & Click to inspect Node
 */

import { formatFloat, truncateText, escapeHtml } from "../utils/formatters.js"

export class HNSWGraphVisualizer {
  constructor(containerElement, onNodeSelect = null) {
    this.container = containerElement
    this.onNodeSelect = onNodeSelect

    this.canvas = null
    this.ctx = null
    this.width = 700
    this.height = 480
    this.dpr = typeof window !== "undefined" ? window.devicePixelRatio || 1 : 1

    // Graph Data from backend
    this.graphData = null
    this.selectedLayer = "all" // 'all' or numeric 0, 1, 2...
    this.selectedNodeId = null
    this.hoveredNode = null

    // Layout coordinates cache: Map<`${nodeId}_${layer}`, { x, y, radius, level, id, ... }>
    this.nodePositions = new Map()

    // Pan & Zoom
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
      <div class="hnsw-visualizer-wrapper">
        <div class="hnsw-toolbar">
          <div class="layer-selector-group" id="layer-selector-tabs">
            <button class="layer-tab active" data-layer="all">All Layers</button>
            <button class="layer-tab" data-layer="0">Layer 0 (Base / Dense)</button>
          </div>
          
          <div class="hnsw-legend">
            <span class="legend-item"><span class="legend-dot dot-entry"></span> ★ Entry Point</span>
            <span class="legend-item"><span class="legend-dot dot-node"></span> Node</span>
            <span class="legend-item"><span class="legend-dot dot-neighbor"></span> Active Neighbor</span>
          </div>

          <div class="canvas-controls">
            <button class="btn btn-xs btn-secondary" id="hnsw-zoom-in">+</button>
            <button class="btn btn-xs btn-secondary" id="hnsw-zoom-out">−</button>
            <button class="btn btn-xs btn-secondary" id="hnsw-zoom-reset">Reset View</button>
          </div>
        </div>

        <div class="hnsw-viewport" id="hnsw-viewport">
          <canvas id="hnsw-canvas"></canvas>
          <div class="canvas-tooltip hidden" id="hnsw-tooltip"></div>
        </div>
      </div>
    `

    this.canvas = this.container.querySelector("#hnsw-canvas")
    this.tooltip = this.container.querySelector("#hnsw-tooltip")
    this.ctx = this.canvas.getContext("2d")

    this.setupEvents()
    this.resize()
  }

  setupEvents() {
    const viewport = this.container.querySelector("#hnsw-viewport")
    const ro = new ResizeObserver(() => this.resize())
    ro.observe(viewport)

    // Canvas interactions
    this.canvas.addEventListener("mousemove", (e) => this.handleMouseMove(e))
    this.canvas.addEventListener("mousedown", (e) => this.handleMouseDown(e))
    window.addEventListener("mouseup", () => this.handleMouseUp())
    this.canvas.addEventListener("mouseleave", () => {
      this.hoveredNode = null
      this.hideTooltip()
      this.render()
    })
    this.canvas.addEventListener("click", (e) => this.handleClick(e))

    this.canvas.addEventListener("wheel", (e) => {
      e.preventDefault()
      const factor = e.deltaY < 0 ? 1.15 : 0.85
      this.zoom = Math.max(0.3, Math.min(5, this.zoom * factor))
      this.render()
    })

    // Zoom buttons
    const btnIn = this.container.querySelector("#hnsw-zoom-in")
    const btnOut = this.container.querySelector("#hnsw-zoom-out")
    const btnReset = this.container.querySelector("#hnsw-zoom-reset")

    if (btnIn) btnIn.addEventListener("click", () => { this.zoom = Math.min(5, this.zoom * 1.25); this.render(); })
    if (btnOut) btnOut.addEventListener("click", () => { this.zoom = Math.max(0.3, this.zoom * 0.8); this.render(); })
    if (btnReset) btnReset.addEventListener("click", () => { this.zoom = 1; this.panX = 0; this.panY = 0; this.render(); })
  }

  resize() {
    const viewport = this.container.querySelector("#hnsw-viewport")
    if (!viewport) return
    const rect = viewport.getBoundingClientRect()
    this.width = Math.max(300, rect.width)
    this.height = Math.max(300, rect.height || 480)

    this.dpr = window.devicePixelRatio || 1
    this.canvas.width = this.width * this.dpr
    this.canvas.height = this.height * this.dpr
    this.canvas.style.width = `${this.width}px`
    this.canvas.style.height = `${this.height}px`

    this.ctx.scale(this.dpr, this.dpr)
    this.computeLayout()
    this.render()
  }

  setGraphData(data) {
    this.graphData = data
    this.updateLayerTabs()
    this.computeLayout()
    this.render()
  }

  updateLayerTabs() {
    if (!this.graphData) return
    const tabsContainer = this.container.querySelector("#layer-selector-tabs")
    if (!tabsContainer) return

    const maxLevel = this.graphData.maxLevel >= 0 ? this.graphData.maxLevel : 0

    let tabsHtml = `<button class="layer-tab ${this.selectedLayer === "all" ? "active" : ""}" data-layer="all">All Layers (Stacked)</button>`

    for (let lvl = maxLevel; lvl >= 0; lvl--) {
      const isTop = lvl === maxLevel
      const isBase = lvl === 0
      const tag = isTop ? " (Highway / Entry)" : isBase ? " (Base / Dense)" : " (Express)"
      const isActive = this.selectedLayer === String(lvl)
      tabsHtml += `
        <button class="layer-tab ${isActive ? "active" : ""}" data-layer="${lvl}">
          Layer ${lvl}${tag}
        </button>
      `
    }

    tabsContainer.innerHTML = tabsHtml

    // Attach click events
    tabsContainer.querySelectorAll(".layer-tab").forEach((btn) => {
      btn.addEventListener("click", () => {
        tabsContainer.querySelectorAll(".layer-tab").forEach((b) => b.classList.remove("active"))
        btn.classList.add("active")
        this.selectedLayer = btn.getAttribute("data-layer")
        this.computeLayout()
        this.render()
      })
    })
  }

  /**
   * Deterministically arrange nodes on layer planes
   */
  computeLayout() {
    this.nodePositions.clear()
    if (!this.graphData || !this.graphData.nodes || this.graphData.nodes.length === 0) {
      return
    }

    const nodes = this.graphData.nodes
    const maxLevel = this.graphData.maxLevel >= 0 ? this.graphData.maxLevel : 0
    const w = this.width
    const h = this.height

    if (this.selectedLayer === "all") {
      // Stacked 2.5D multi-plane layout
      const totalLayers = maxLevel + 1
      const layerHeight = (h - 100) / totalLayers

      for (let lvl = 0; lvl <= maxLevel; lvl++) {
        const layerNodes = nodes.filter((n) => n.level >= lvl)
        const planeY = h - 60 - lvl * layerHeight
        const count = layerNodes.length

        layerNodes.forEach((node, idx) => {
          // Spread along plane with slight perspective
          const spacing = (w - 180) / Math.max(1, count + 1)
          const x = 90 + (idx + 1) * spacing
          const y = planeY + Math.sin(idx * 1.5) * 8

          this.nodePositions.set(`${node.id}_${lvl}`, {
            id: node.id,
            level: node.level,
            currentLayer: lvl,
            x,
            y,
            radius: node.id === this.graphData.entryPoint ? 9 : 6.5,
            isEntryPoint: node.id === this.graphData.entryPoint && lvl === node.level,
            neighbors: node.neighbors?.[lvl] || [],
            rawNode: node,
          })
        })
      }
    } else {
      // Single 2D circular / force-like layout for the selected layer
      const lvl = Number(this.selectedLayer)
      const layerNodes = nodes.filter((n) => n.level >= lvl)
      const count = layerNodes.length
      const centerX = w / 2
      const centerY = h / 2 + 10
      const radius = Math.min(w, h) * 0.36

      layerNodes.forEach((node, idx) => {
        const angle = (idx / count) * Math.PI * 2 - Math.PI / 2
        const r = count === 1 ? 0 : radius * (0.65 + (idx % 2) * 0.35)
        const x = centerX + Math.cos(angle) * r
        const y = centerY + Math.sin(angle) * r

        this.nodePositions.set(`${node.id}_${lvl}`, {
          id: node.id,
          level: node.level,
          currentLayer: lvl,
          x,
          y,
          radius: node.id === this.graphData.entryPoint ? 10 : 7,
          isEntryPoint: node.id === this.graphData.entryPoint && lvl === node.level,
          neighbors: node.neighbors?.[lvl] || [],
          rawNode: node,
        })
      })
    }
  }

  render() {
    if (!this.ctx) return
    const ctx = this.ctx
    const w = this.width
    const h = this.height

    ctx.save()
    ctx.clearRect(0, 0, w, h)

    // Pan & zoom transform
    ctx.translate(w / 2 + this.panX, h / 2 + this.panY)
    ctx.scale(this.zoom, this.zoom)
    ctx.translate(-w / 2, -h / 2)

    // Step 1: Draw layer plane backgrounds if 'all' is selected
    if (this.selectedLayer === "all" && this.graphData) {
      const maxLevel = this.graphData.maxLevel >= 0 ? this.graphData.maxLevel : 0
      const totalLayers = maxLevel + 1
      const layerHeight = (h - 100) / totalLayers

      for (let lvl = 0; lvl <= maxLevel; lvl++) {
        const planeY = h - 60 - lvl * layerHeight
        ctx.fillStyle = lvl % 2 === 0 ? "rgba(30, 41, 59, 0.45)" : "rgba(15, 23, 42, 0.5)"
        ctx.strokeStyle = "rgba(71, 85, 105, 0.35)"
        ctx.lineWidth = 1
        ctx.beginPath()
        ctx.roundRect(40, planeY - 30, w - 80, 60, 8)
        ctx.fill()
        ctx.stroke()

        // Plane label
        ctx.fillStyle = "#94a3b8"
        ctx.font = "bold 11px JetBrains Mono, monospace"
        ctx.fillText(`LAYER ${lvl} ${lvl === maxLevel ? "(TOP / ENTRY)" : lvl === 0 ? "(BASE / DENSE)" : ""}`, 54, planeY - 12)
      }
    }

    // Step 2: Draw vertical interlayer links (same node present across levels)
    if (this.selectedLayer === "all" && this.graphData) {
      const maxLevel = this.graphData.maxLevel >= 0 ? this.graphData.maxLevel : 0
      for (const node of this.graphData.nodes) {
        if (node.level > 0) {
          ctx.beginPath()
          ctx.setLineDash([3, 3])
          ctx.strokeStyle = "rgba(148, 163, 184, 0.25)"
          ctx.lineWidth = 1.2

          for (let lvl = 0; lvl < node.level; lvl++) {
            const p1 = this.nodePositions.get(`${node.id}_${lvl}`)
            const p2 = this.nodePositions.get(`${node.id}_${lvl + 1}`)
            if (p1 && p2) {
              ctx.moveTo(p1.x, p1.y)
              ctx.lineTo(p2.x, p2.y)
            }
          }
          ctx.stroke()
          ctx.setLineDash([])
        }
      }
    }

    // Step 3: Draw Real Intra-Layer Edges
    const activeNode = this.hoveredNode || (this.selectedNodeId ? Array.from(this.nodePositions.values()).find((n) => n.id === this.selectedNodeId) : null)

    this.nodePositions.forEach((nodePos) => {
      const neighbors = nodePos.neighbors || []
      neighbors.forEach((nbrId) => {
        const nbrPos = this.nodePositions.get(`${nbrId}_${nodePos.currentLayer}`)
        if (nbrPos) {
          const isEdgeActive =
            activeNode &&
            (activeNode.id === nodePos.id || activeNode.id === nbrId) &&
            activeNode.currentLayer === nodePos.currentLayer

          ctx.beginPath()
          ctx.strokeStyle = isEdgeActive
            ? "#6366f1"
            : "rgba(99, 102, 241, 0.25)"
          ctx.lineWidth = isEdgeActive ? 2.2 : 1
          ctx.moveTo(nodePos.x, nodePos.y)
          ctx.lineTo(nbrPos.x, nbrPos.y)
          ctx.stroke()
        }
      })
    })

    // Step 4: Draw Graph Nodes
    this.nodePositions.forEach((nodePos) => {
      const isHovered = this.hoveredNode && this.hoveredNode.id === nodePos.id && this.hoveredNode.currentLayer === nodePos.currentLayer
      const isSelected = this.selectedNodeId === nodePos.id
      const isNeighborOfActive =
        activeNode &&
        activeNode.neighbors?.includes(nodePos.id) &&
        activeNode.currentLayer === nodePos.currentLayer

      let nodeColor = "#64748b"
      if (nodePos.isEntryPoint) nodeColor = "#f59e0b"
      else if (isSelected || isHovered) nodeColor = "#6366f1"
      else if (isNeighborOfActive) nodeColor = "#10b981"
      else if (nodePos.currentLayer > 0) nodeColor = "#06b6d4"

      // Outer glow for entry point or active
      if (nodePos.isEntryPoint || isSelected || isHovered || isNeighborOfActive) {
        ctx.beginPath()
        ctx.arc(nodePos.x, nodePos.y, nodePos.radius + 5, 0, Math.PI * 2)
        ctx.fillStyle = nodePos.isEntryPoint
          ? "rgba(245, 158, 11, 0.25)"
          : isNeighborOfActive
            ? "rgba(16, 185, 129, 0.25)"
            : "rgba(99, 102, 241, 0.25)"
        ctx.fill()
      }

      // Node body
      ctx.beginPath()
      ctx.arc(nodePos.x, nodePos.y, nodePos.radius, 0, Math.PI * 2)
      ctx.fillStyle = nodeColor
      ctx.fill()
      ctx.strokeStyle = "#ffffff"
      ctx.lineWidth = isHovered || isSelected ? 2 : 1.2
      ctx.stroke()

      // Node label
      ctx.fillStyle = isHovered || isSelected ? "#ffffff" : "#cbd5e1"
      ctx.font = "9px JetBrains Mono, monospace"
      ctx.textAlign = "center"
      ctx.textBaseline = "middle"
      const shortId = nodePos.id.length > 14 ? nodePos.id.substring(0, 12) + ".." : nodePos.id
      ctx.fillText(shortId, nodePos.x, nodePos.y + nodePos.radius + 9)

      // Entry point badge
      if (nodePos.isEntryPoint) {
        ctx.fillStyle = "#fbbf24"
        ctx.font = "bold 9px Inter, sans-serif"
        ctx.fillText("★ ENTRY", nodePos.x, nodePos.y - nodePos.radius - 8)
      }
    })

    ctx.restore()
  }

  screenToWorld(screenX, screenY) {
    const w = this.width
    const h = this.height
    const centeredX = screenX - (w / 2 + this.panX)
    const centeredY = screenY - (h / 2 + this.panY)
    return {
      x: centeredX / this.zoom + w / 2,
      y: centeredY / this.zoom + h / 2,
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

    let found = null
    for (const nodePos of this.nodePositions.values()) {
      const dist = Math.hypot(world.x - nodePos.x, world.y - nodePos.y)
      if (dist < (nodePos.radius + 5) / this.zoom) {
        found = nodePos
        break
      }
    }

    if (found) {
      this.hoveredNode = found
      this.canvas.style.cursor = "pointer"
      this.showTooltip(e.clientX, e.clientY, found)
    } else {
      this.hoveredNode = null
      this.canvas.style.cursor = this.isDragging ? "grabbing" : "grab"
      this.hideTooltip()
    }
    this.render()
  }

  handleMouseUp() {
    this.isDragging = false
  }

  handleClick(e) {
    if (this.hoveredNode) {
      this.selectedNodeId = this.hoveredNode.id
      this.render()
      if (this.onNodeSelect) {
        this.onNodeSelect(this.hoveredNode)
      }
    }
  }

  showTooltip(clientX, clientY, nodePos) {
    if (!this.tooltip) return
    const rect = this.container.getBoundingClientRect()
    const left = clientX - rect.left + 15
    const top = clientY - rect.top + 15

    const node = nodePos.rawNode
    const neighborsAtLayer = nodePos.neighbors || []
    const totalNeighbors = Object.values(node.neighbors || {}).reduce(
      (acc, arr) => acc + (arr ? arr.length : 0),
      0,
    )

    const html = `
      <div class="tooltip-header">
        <span class="tooltip-title font-mono">${escapeHtml(nodePos.id)}</span>
        ${nodePos.isEntryPoint ? `<span class="tooltip-badge badge-amber">★ Entry Point</span>` : `<span class="tooltip-badge">Layer ${nodePos.currentLayer}</span>`}
      </div>
      <div class="tooltip-meta">
        <span><strong>Node Max Level:</strong> ${node.level}</span>
        <span><strong>Neighbors (Layer ${nodePos.currentLayer}):</strong> ${neighborsAtLayer.length}</span>
        <span><strong>Total Connections:</strong> ${totalNeighbors}</span>
      </div>
      ${
        neighborsAtLayer.length > 0
          ? `<div class="tooltip-neighbors font-mono">Neighbors: ${escapeHtml(neighborsAtLayer.slice(0, 4).join(", "))}${neighborsAtLayer.length > 4 ? ` (+${neighborsAtLayer.length - 4})` : ""}</div>`
          : `<div class="tooltip-neighbors font-mono">No connections at this layer</div>`
      }
      ${node.metadata?.text ? `<div class="tooltip-preview">"${escapeHtml(truncateText(node.metadata.text, 90))}"</div>` : ""}
      <div class="tooltip-hint">Click to inspect node in details panel</div>
    `

    this.tooltip.innerHTML = html
    this.tooltip.style.left = `${Math.min(left, this.width - 250)}px`
    this.tooltip.style.top = `${Math.min(top, this.height - 180)}px`
    this.tooltip.classList.remove("hidden")
  }

  hideTooltip() {
    if (this.tooltip) {
      this.tooltip.classList.add("hidden")
    }
  }
}
