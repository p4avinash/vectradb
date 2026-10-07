/**
 * VectraDB Explorer - Vector Explorer & CRUD Page
 */

import { api } from "../api.js"
import { modal } from "../components/modal.js"
import { toast } from "../components/toast.js"
import { formatFloat, formatVectorPreview, truncateText, escapeHtml, formatJson } from "../utils/formatters.js"

export class VectorsPage {
  constructor(container) {
    this.container = container
    this.vectors = []
    this.filteredVectors = []
    this.searchTerm = ""
    this.isLoading = false
  }

  async render() {
    this.container.innerHTML = `
      <div class="page-container fade-in">
        <div class="page-header">
          <div>
            <h1 class="page-title">Vector Explorer</h1>
            <p class="page-subtitle">Inspect, query, create, update, and manage high-dimensional vector embeddings</p>
          </div>
          <div class="header-actions">
            <button class="btn btn-primary" id="btn-create-vector">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="12" y1="5" x2="12" y2="19"></line><line x1="5" y1="12" x2="19" y2="12"></line></svg>
              Insert New Vector
            </button>
          </div>
        </div>

        <!-- Filters & Search Bar -->
        <div class="table-toolbar card">
          <div class="search-box">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="11" cy="11" r="8"></circle><line x1="21" y1="21" x2="16.65" y2="16.65"></line></svg>
            <input type="text" id="vector-search-input" class="search-input" placeholder="Search by Vector ID, Document, Source, or text snippet..." />
          </div>
          <div class="toolbar-stats font-mono" id="vector-count-badge">
            0 vectors
          </div>
        </div>

        <!-- Vectors Table -->
        <div class="card table-card" id="vectors-table-container">
          <div class="loading-state">
            <div class="spinner"></div>
            <span>Loading stored vectors from database...</span>
          </div>
        </div>
      </div>
    `

    this.setupEvents()
    await this.loadVectors()
  }

  setupEvents() {
    const searchInput = this.container.querySelector("#vector-search-input")
    if (searchInput) {
      searchInput.addEventListener("input", (e) => {
        this.searchTerm = e.target.value.toLowerCase().trim()
        this.filterVectors()
      })
    }

    const createBtn = this.container.querySelector("#btn-create-vector")
    if (createBtn) {
      createBtn.addEventListener("click", () => this.openCreateModal())
    }
  }

  async loadVectors() {
    this.isLoading = true
    try {
      const res = await api.getVectors()
      this.vectors = (res.success && res.data) ? res.data : []
      this.filterVectors()
    } catch (err) {
      const tableContainer = this.container.querySelector("#vectors-table-container")
      if (tableContainer) {
        tableContainer.innerHTML = `
          <div class="error-banner">
            <strong>Error loading vectors:</strong> ${escapeHtml(err.message)}
          </div>
        `
      }
      toast.error(`Failed to load vectors: ${err.message}`)
    } finally {
      this.isLoading = false
    }
  }

  filterVectors() {
    if (!this.searchTerm) {
      this.filteredVectors = [...this.vectors]
    } else {
      this.filteredVectors = this.vectors.filter((item) => {
        const id = (item.id || "").toLowerCase()
        const docId = (item.metadata?.documentId || "").toLowerCase()
        const src = (item.metadata?.source || "").toLowerCase()
        const txt = (item.metadata?.text || "").toLowerCase()
        return (
          id.includes(this.searchTerm) ||
          docId.includes(this.searchTerm) ||
          src.includes(this.searchTerm) ||
          txt.includes(this.searchTerm)
        )
      })
    }

    const countBadge = this.container.querySelector("#vector-count-badge")
    if (countBadge) {
      countBadge.textContent = `${this.filteredVectors.length} of ${this.vectors.length} vectors`
    }

    this.renderTable()
  }

  renderTable() {
    const tableContainer = this.container.querySelector("#vectors-table-container")
    if (!tableContainer) return

    if (this.filteredVectors.length === 0) {
      tableContainer.innerHTML = `
        <div class="empty-state">
          <div class="empty-icon">🗄️</div>
          <h4 class="empty-title">No Vectors Found</h4>
          <p class="empty-desc">${this.searchTerm ? "No vectors match your search criteria." : "Vector storage is currently empty. Ingest a document or create a vector to get started."}</p>
          ${!this.searchTerm ? `<a href="#embed" class="btn btn-primary btn-sm">Go to Embed Data</a>` : ""}
        </div>
      `
      return
    }

    tableContainer.innerHTML = `
      <div class="table-responsive">
        <table class="data-table">
          <thead>
            <tr>
              <th>Vector ID</th>
              <th>Document / Source</th>
              <th>Chunk</th>
              <th>Text Preview</th>
              <th>Dimension</th>
              <th>Vector Preview</th>
              <th class="text-right">Actions</th>
            </tr>
          </thead>
          <tbody>
            ${this.filteredVectors
              .map(
                (item) => `
              <tr data-vector-id="${escapeHtml(item.id)}">
                <td>
                  <span class="font-mono font-bold text-highlight">${escapeHtml(item.id)}</span>
                </td>
                <td>
                  <div class="doc-meta-cell">
                    <span class="doc-id font-mono">${escapeHtml(item.metadata?.documentId || "--")}</span>
                    <span class="source-tag">${escapeHtml(item.metadata?.source || "--")}</span>
                  </div>
                </td>
                <td>
                  <span class="badge-chunk font-mono">${item.metadata?.chunkIndex !== undefined ? `#${item.metadata.chunkIndex}` : "--"}</span>
                </td>
                <td class="text-cell" title="${escapeHtml(item.metadata?.text || "")}">
                  ${escapeHtml(truncateText(item.metadata?.text || "--", 75))}
                </td>
                <td>
                  <span class="dim-badge font-mono">${item.vector ? `${item.vector.length}D` : "384D"}</span>
                </td>
                <td class="vector-preview-cell font-mono">
                  ${formatVectorPreview(item.vector, 3)}
                </td>
                <td class="text-right">
                  <div class="action-btn-group">
                    <button class="btn btn-xs btn-outline btn-view-vector" data-id="${escapeHtml(item.id)}" title="View Vector">
                      View
                    </button>
                    <button class="btn btn-xs btn-outline btn-edit-vector" data-id="${escapeHtml(item.id)}" title="Edit Metadata">
                      Edit
                    </button>
                    <button class="btn btn-xs btn-danger-outline btn-delete-vector" data-id="${escapeHtml(item.id)}" title="Delete Vector">
                      Delete
                    </button>
                  </div>
                </td>
              </tr>
            `,
              )
              .join("")}
          </tbody>
        </table>
      </div>
    `

    // Attach table action events
    tableContainer.querySelectorAll(".btn-view-vector").forEach((btn) => {
      btn.addEventListener("click", () => {
        const id = btn.getAttribute("data-id")
        const record = this.vectors.find((v) => v.id === id)
        if (record) this.openViewModal(record)
      })
    })

    tableContainer.querySelectorAll(".btn-edit-vector").forEach((btn) => {
      btn.addEventListener("click", () => {
        const id = btn.getAttribute("data-id")
        const record = this.vectors.find((v) => v.id === id)
        if (record) this.openEditModal(record)
      })
    })

    tableContainer.querySelectorAll(".btn-delete-vector").forEach((btn) => {
      btn.addEventListener("click", () => {
        const id = btn.getAttribute("data-id")
        this.confirmDelete(id)
      })
    })
  }

  /**
   * View Modal showing first N numbers + "Show full vector" scrollable section
   */
  openViewModal(record) {
    const vector = record.vector || []
    const firstN = vector.slice(0, 16)
    const dim = vector.length || 384

    const content = `
      <div class="vector-details-modal">
        <div class="detail-grid">
          <div class="detail-item">
            <span class="detail-lbl">Vector ID:</span>
            <span class="detail-val font-mono font-bold">${escapeHtml(record.id)}</span>
          </div>
          <div class="detail-item">
            <span class="detail-lbl">Dimension:</span>
            <span class="detail-val font-mono color-cyan">${dim} Float32 Values</span>
          </div>
          <div class="detail-item">
            <span class="detail-lbl">Document ID:</span>
            <span class="detail-val font-mono">${escapeHtml(record.metadata?.documentId || "--")}</span>
          </div>
          <div class="detail-item">
            <span class="detail-lbl">Source File:</span>
            <span class="detail-val font-mono">${escapeHtml(record.metadata?.source || "--")}</span>
          </div>
          <div class="detail-item">
            <span class="detail-lbl">Chunk Index:</span>
            <span class="detail-val font-mono">${record.metadata?.chunkIndex !== undefined ? record.metadata.chunkIndex : "--"}</span>
          </div>
        </div>

        ${
          record.metadata?.text
            ? `
          <div class="detail-text-section">
            <label class="detail-section-title">Stored Text Content</label>
            <div class="text-content-box">${escapeHtml(record.metadata.text)}</div>
          </div>
        `
            : ""
        }

        <div class="detail-meta-section">
          <label class="detail-section-title">Metadata JSON</label>
          <pre class="json-code-box font-mono">${escapeHtml(formatJson(record.metadata || {}))}</pre>
        </div>

        <div class="detail-vector-section">
          <div class="vector-header-row">
            <label class="detail-section-title">Vector Values (First ${firstN.length} of ${dim})</label>
            <button class="btn btn-xs btn-outline" id="btn-toggle-full-vector">Show Full Vector (${dim} floats)</button>
          </div>
          
          <div class="vector-chips-preview" id="vector-chips-preview">
            ${firstN.map((v, i) => `<span class="vector-chip font-mono"><span class="chip-idx">[${i}]</span> ${formatFloat(v, 4)}</span>`).join("")}
          </div>

          <div class="full-vector-container hidden" id="full-vector-container">
            <div class="full-vector-toolbar">
              <span class="font-mono text-muted text-xs">All ${dim} dimensions (Scrollable):</span>
              <button class="btn btn-xs btn-secondary" id="btn-copy-vector">Copy Vector JSON</button>
            </div>
            <pre class="full-vector-code font-mono" id="full-vector-code">${escapeHtml(JSON.stringify(vector, null, 2))}</pre>
          </div>
        </div>
      </div>
    `

    modal.open({
      title: `Vector Details: ${record.id}`,
      content,
      size: "large",
      actions: [
        {
          label: "Edit Metadata",
          variant: "secondary",
          onClick: () => {
            modal.close()
            this.openEditModal(record)
          },
        },
        {
          label: "Close",
          variant: "primary",
          onClick: () => modal.close(),
        },
      ],
    })

    // Attach toggle full vector
    setTimeout(() => {
      const toggleBtn = document.getElementById("btn-toggle-full-vector")
      const fullContainer = document.getElementById("full-vector-container")
      const copyBtn = document.getElementById("btn-copy-vector")

      if (toggleBtn && fullContainer) {
        toggleBtn.addEventListener("click", () => {
          const isHidden = fullContainer.classList.contains("hidden")
          if (isHidden) {
            fullContainer.classList.remove("hidden")
            toggleBtn.textContent = "Hide Full Vector"
          } else {
            fullContainer.classList.add("hidden")
            toggleBtn.textContent = `Show Full Vector (${dim} floats)`
          }
        })
      }

      if (copyBtn) {
        copyBtn.addEventListener("click", () => {
          navigator.clipboard.writeText(JSON.stringify(vector))
          toast.success("Vector JSON copied to clipboard")
        })
      }
    }, 50)
  }

  /**
   * Create Vector Modal with text embedding generator or raw float input
   */
  openCreateModal() {
    const content = `
      <form id="create-vector-form" class="modal-form">
        <div class="form-group">
          <label class="form-label" for="new-vector-id">Vector ID <span class="required">*</span></label>
          <input type="text" id="new-vector-id" class="form-input font-mono" placeholder="e.g. custom-doc-01" required />
        </div>

        <div class="form-tabs-small">
          <button type="button" class="tab-small active" id="tab-gen-embed">Generate from Text (Recommended)</button>
          <button type="button" class="tab-small" id="tab-raw-vector">Raw Float Array</button>
        </div>

        <!-- Mode A: Generate Embedding from text -->
        <div id="mode-text-embed">
          <div class="form-group">
            <label class="form-label" for="new-vector-text">Text to Embed</label>
            <textarea id="new-vector-text" class="form-textarea" rows="3" placeholder="Enter text to automatically generate 384D embedding..."></textarea>
          </div>
        </div>

        <!-- Mode B: Paste raw vector -->
        <div id="mode-raw-vector" class="hidden">
          <div class="form-group">
            <label class="form-label" for="new-vector-raw">Raw Vector Array (JSON array of floats)</label>
            <textarea id="new-vector-raw" class="form-textarea font-mono text-xs" rows="4" placeholder="[0.123, -0.456, ...]"></textarea>
          </div>
        </div>

        <div class="form-row">
          <div class="form-group">
            <label class="form-label" for="new-doc-id">Document ID</label>
            <input type="text" id="new-doc-id" class="form-input font-mono" placeholder="e.g. manual-entry" />
          </div>
          <div class="form-group">
            <label class="form-label" for="new-doc-source">Source Name</label>
            <input type="text" id="new-doc-source" class="form-input font-mono" placeholder="e.g. user-input.txt" />
          </div>
        </div>

        <div class="form-group">
          <label class="form-label" for="new-vector-meta">Additional Metadata (JSON)</label>
          <textarea id="new-vector-meta" class="form-textarea font-mono text-xs" rows="2" placeholder='{"category": "ai", "tag": "test"}'></textarea>
        </div>
      </form>
    `

    modal.open({
      title: "Insert New Vector",
      content,
      size: "medium",
      actions: [
        {
          label: "Cancel",
          variant: "secondary",
          onClick: () => modal.close(),
        },
        {
          label: "Create Vector",
          variant: "primary",
          onClick: async (e, m) => {
            const id = document.getElementById("new-vector-id").value.trim()
            const isTextMode = !document.getElementById("mode-text-embed").classList.contains("hidden")
            const text = document.getElementById("new-vector-text").value.trim()
            const rawVectorStr = document.getElementById("new-vector-raw").value.trim()
            const docId = document.getElementById("new-doc-id").value.trim()
            const source = document.getElementById("new-doc-source").value.trim()
            const metaStr = document.getElementById("new-vector-meta").value.trim()

            if (!id) {
              toast.error("Vector ID is required")
              return
            }

            let vector = null
            try {
              if (isTextMode) {
                if (!text) {
                  toast.error("Please enter text to embed")
                  return
                }
                const embedRes = await api.embedText({ text, isQuery: false })
                vector = embedRes.data.vector
              } else {
                vector = JSON.parse(rawVectorStr)
                if (!Array.isArray(vector) || vector.length === 0) {
                  throw new Error("Vector must be a non-empty array of floats")
                }
              }

              let metadata = {}
              if (metaStr) {
                try {
                  metadata = JSON.parse(metaStr)
                } catch {
                  toast.error("Metadata must be valid JSON")
                  return
                }
              }
              if (docId) metadata.documentId = docId
              if (source) metadata.source = source
              if (text) metadata.text = text

              await api.createVector({ id, vector, metadata })
              toast.success(`Vector "${id}" created successfully`)
              modal.close()
              await this.loadVectors()
            } catch (err) {
              toast.error(`Failed to create vector: ${err.message}`)
            }
          },
        },
      ],
    })

    // Setup mode tabs
    setTimeout(() => {
      const tabGen = document.getElementById("tab-gen-embed")
      const tabRaw = document.getElementById("tab-raw-vector")
      const modeText = document.getElementById("mode-text-embed")
      const modeRaw = document.getElementById("mode-raw-vector")

      if (tabGen && tabRaw) {
        tabGen.addEventListener("click", () => {
          tabGen.classList.add("active")
          tabRaw.classList.remove("active")
          modeText.classList.remove("hidden")
          modeRaw.classList.add("hidden")
        })
        tabRaw.addEventListener("click", () => {
          tabRaw.classList.add("active")
          tabGen.classList.remove("active")
          modeRaw.classList.remove("hidden")
          modeText.classList.add("hidden")
        })
      }
    }, 50)
  }

  /**
   * Edit Vector Modal (Update Metadata)
   */
  openEditModal(record) {
    const content = `
      <form id="edit-vector-form" class="modal-form">
        <div class="form-group">
          <label class="form-label">Vector ID</label>
          <input type="text" class="form-input font-mono" value="${escapeHtml(record.id)}" disabled />
        </div>

        <div class="form-row">
          <div class="form-group">
            <label class="form-label" for="edit-doc-id">Document ID</label>
            <input type="text" id="edit-doc-id" class="form-input font-mono" value="${escapeHtml(record.metadata?.documentId || "")}" />
          </div>
          <div class="form-group">
            <label class="form-label" for="edit-source">Source Name</label>
            <input type="text" id="edit-source" class="form-input font-mono" value="${escapeHtml(record.metadata?.source || "")}" />
          </div>
        </div>

        <div class="form-group">
          <label class="form-label" for="edit-text">Text Content</label>
          <textarea id="edit-text" class="form-textarea" rows="3">${escapeHtml(record.metadata?.text || "")}</textarea>
        </div>

        <div class="form-group">
          <label class="form-label" for="edit-meta-json">Full Metadata JSON</label>
          <textarea id="edit-meta-json" class="form-textarea font-mono text-xs" rows="4">${escapeHtml(formatJson(record.metadata || {}))}</textarea>
        </div>
      </form>
    `

    modal.open({
      title: `Edit Vector: ${record.id}`,
      content,
      size: "medium",
      actions: [
        {
          label: "Cancel",
          variant: "secondary",
          onClick: () => modal.close(),
        },
        {
          label: "Save Changes",
          variant: "primary",
          onClick: async () => {
            try {
              const metaJsonStr = document.getElementById("edit-meta-json").value.trim()
              const docId = document.getElementById("edit-doc-id").value.trim()
              const source = document.getElementById("edit-source").value.trim()
              const text = document.getElementById("edit-text").value.trim()

              let metadata = {}
              if (metaJsonStr) {
                metadata = JSON.parse(metaJsonStr)
              }
              if (docId) metadata.documentId = docId
              if (source) metadata.source = source
              if (text) metadata.text = text

              await api.updateVector(record.id, { metadata })
              toast.success(`Vector "${record.id}" updated successfully`)
              modal.close()
              await this.loadVectors()
            } catch (err) {
              toast.error(`Failed to update vector: ${err.message}`)
            }
          },
        },
      ],
    })
  }

  /**
   * Confirm and delete vector
   */
  confirmDelete(id) {
    modal.open({
      title: "Delete Vector",
      content: `
        <div class="delete-warning">
          <div class="warning-icon">⚠️</div>
          <p>Are you sure you want to delete vector <strong class="font-mono text-highlight">${escapeHtml(id)}</strong>?</p>
          <p class="text-muted text-xs">This will permanently remove the vector from both VectorStore memory, data/vectors.json, and the HNSW graph index.</p>
        </div>
      `,
      size: "small",
      actions: [
        {
          label: "Cancel",
          variant: "secondary",
          onClick: () => modal.close(),
        },
        {
          label: "Delete",
          variant: "danger",
          onClick: async () => {
            try {
              await api.deleteVector(id)
              toast.success(`Vector "${id}" deleted successfully`)
              modal.close()
              await this.loadVectors()
            } catch (err) {
              toast.error(`Delete failed: ${err.message}`)
            }
          },
        },
      ],
    })
  }
}
