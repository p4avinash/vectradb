/**
 * VectraDB Explorer - Modal Dialog Component
 */

class ModalManager {
  constructor() {
    this.container = null
    this.init()
  }

  init() {
    if (typeof document === "undefined") return
    let container = document.getElementById("modal-container")
    if (!container) {
      container = document.createElement("div")
      container.id = "modal-container"
      container.className = "modal-backdrop hidden"
      document.body.appendChild(container)
    }
    this.container = container

    // Close on backdrop click
    this.container.addEventListener("click", (e) => {
      if (e.target === this.container) {
        this.close()
      }
    })

    // Close on ESC key
    document.addEventListener("keydown", (e) => {
      if (e.key === "Escape" && !this.container.classList.contains("hidden")) {
        this.close()
      }
    })
  }

  /**
   * Open a modal dialog
   * @param {Object} options
   * @param {string} options.title - Modal title
   * @param {string} options.content - HTML content string or HTMLElement
   * @param {string} [options.size='medium'] - 'small' | 'medium' | 'large' | 'xlarge'
   * @param {Array<{ label: string, variant?: 'primary'|'secondary'|'danger', onClick?: Function }>} [options.actions]
   */
  open({ title = "", content = "", size = "medium", actions = [] }) {
    if (!this.container) this.init()

    let actionsHtml = ""
    if (actions.length > 0) {
      actionsHtml = `
        <div class="modal-footer">
          ${actions
            .map(
              (action, i) => `
              <button class="btn btn-${action.variant || "secondary"}" data-action-idx="${i}">
                ${action.label}
              </button>
            `,
            )
            .join("")}
        </div>
      `
    }

    const contentHtml = typeof content === "string" ? content : ""

    this.container.innerHTML = `
      <div class="modal-dialog modal-${size} modal-animate-in">
        <div class="modal-header">
          <h3 class="modal-title">${title}</h3>
          <button class="modal-close-btn" aria-label="Close modal">&times;</button>
        </div>
        <div class="modal-body" id="modal-body-content">
          ${contentHtml}
        </div>
        ${actionsHtml}
      </div>
    `

    if (content instanceof HTMLElement) {
      const bodyEl = this.container.querySelector("#modal-body-content")
      bodyEl.appendChild(content)
    }

    // Attach close button
    const closeBtn = this.container.querySelector(".modal-close-btn")
    if (closeBtn) {
      closeBtn.addEventListener("click", () => this.close())
    }

    // Attach actions
    actions.forEach((action, idx) => {
      const btn = this.container.querySelector(`[data-action-idx="${idx}"]`)
      if (btn && action.onClick) {
        btn.addEventListener("click", (e) => {
          action.onClick(e, this)
        })
      }
    })

    this.container.classList.remove("hidden")
    document.body.classList.add("modal-open")
  }

  /**
   * Close the currently open modal
   */
  close() {
    if (!this.container) return
    this.container.classList.add("hidden")
    this.container.innerHTML = ""
    document.body.classList.remove("modal-open")
  }
}

export const modal = new ModalManager()
