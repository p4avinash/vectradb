/**
 * VectraDB Explorer - Toast Notification System
 */

class ToastManager {
  constructor() {
    this.container = null
    this.init()
  }

  init() {
    if (typeof document === "undefined") return
    let container = document.getElementById("toast-container")
    if (!container) {
      container = document.createElement("div")
      container.id = "toast-container"
      container.className = "toast-container"
      document.body.appendChild(container)
    }
    this.container = container
  }

  /**
   * Show a toast message
   * @param {string} message
   * @param {'success'|'error'|'info'|'warning'} type
   * @param {number} duration
   */
  show(message, type = "info", duration = 3500) {
    if (!this.container) this.init()

    const toast = document.createElement("div")
    toast.className = `toast toast-${type} toast-enter`

    const iconSvg = this.getIcon(type)

    toast.innerHTML = `
      <div class="toast-icon">${iconSvg}</div>
      <div class="toast-content">
        <div class="toast-message">${message}</div>
      </div>
      <button class="toast-close" aria-label="Close">&times;</button>
    `

    const closeBtn = toast.querySelector(".toast-close")
    const removeToast = () => {
      toast.classList.remove("toast-enter")
      toast.classList.add("toast-exit")
      setTimeout(() => {
        if (toast.parentElement) toast.parentElement.removeChild(toast)
      }, 250)
    }

    closeBtn.addEventListener("click", removeToast)

    this.container.appendChild(toast)

    // Auto dismiss
    if (duration > 0) {
      setTimeout(removeToast, duration)
    }
  }

  success(msg, duration) {
    this.show(msg, "success", duration)
  }

  error(msg, duration = 5000) {
    this.show(msg, "error", duration)
  }

  info(msg, duration) {
    this.show(msg, "info", duration)
  }

  warning(msg, duration) {
    this.show(msg, "warning", duration)
  }

  getIcon(type) {
    switch (type) {
      case "success":
        return `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#10b981" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M20 6L9 17l-5-5"/></svg>`
      case "error":
        return `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#f43f5e" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><line x1="15" y1="9" x2="9" y2="15"/><line x1="9" y1="9" x2="15" y2="15"/></svg>`
      case "warning":
        return `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#f59e0b" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>`
      default:
        return `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#6366f1" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><line x1="12" y1="16" x2="12" y2="12"/><line x1="12" y1="8" x2="12.01" y2="8"/></svg>`
    }
  }
}

export const toast = new ToastManager()
