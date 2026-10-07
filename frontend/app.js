/**
 * VectraDB Explorer - Main Application Coordinator & Hash Router
 */

import { api } from "./api.js"
import { renderSidebar } from "./components/sidebar.js"
import { renderHeader } from "./components/header.js"
import { toast } from "./components/toast.js"
import { modal } from "./components/modal.js"

// Page classes
import { DashboardPage } from "./pages/dashboard.js"
import { EmbedPage } from "./pages/embed.js"
import { VectorsPage } from "./pages/vectors.js"
import { QueryPage } from "./pages/query.js"
import { HNSWPage } from "./pages/hnsw.js"
import { RAGPage } from "./pages/rag.js"
import { SimilarityPage } from "./pages/similarity.js"

class App {
  constructor() {
    this.currentRoute = "overview"
    this.isConnected = false
    this.pollInterval = null
    this.activePageInstance = null
  }

  async init() {
    this.renderShell()
    this.setupRouter()
    this.setupEvents()

    // Initial Health Check
    await this.checkHealth()

    // Periodic Health Check
    this.pollInterval = setInterval(() => this.checkHealth(), 12000)

    // Initial Route Navigation
    this.navigate(window.location.hash.replace("#", "") || "overview")
  }

  renderShell() {
    const appEl = document.getElementById("app")
    if (!appEl) return

    appEl.innerHTML = `
      <div class="app-layout">
        <!-- Sidebar Navigation -->
        <div id="sidebar-container">
          ${renderSidebar(this.currentRoute)}
        </div>

        <!-- Main Content Area -->
        <div class="main-wrapper">
          <!-- Header Bar -->
          <div id="header-container">
            ${renderHeader("Overview", ["Overview"])}
          </div>

          <!-- Offline Warning Banner -->
          <div id="offline-banner" class="offline-banner hidden">
            <div class="offline-banner-content">
              <span class="warning-icon">⚠️</span>
              <span><strong>Backend Offline:</strong> Unable to connect to VectraDB Express API at <code>http://localhost:3000</code>. Please make sure <code>npm run dev</code> or <code>npm start</code> is running.</span>
            </div>
            <button class="btn btn-xs btn-outline" id="btn-retry-connection">Retry</button>
          </div>

          <!-- Dynamic View Container -->
          <main class="main-content" id="app-view"></main>
        </div>
      </div>
    `
  }

  setupRouter() {
    window.addEventListener("hashchange", () => {
      const route = window.location.hash.replace("#", "") || "overview"
      this.navigate(route)
    })
  }

  setupEvents() {
    // Retry connection button
    document.addEventListener("click", (e) => {
      if (e.target && e.target.id === "btn-retry-connection") {
        this.checkHealth()
      }
    })

    // Header refresh button
    document.addEventListener("click", (e) => {
      const refreshBtn = e.target.closest("#header-refresh-btn")
      if (refreshBtn) {
        toast.info("Refreshing view...")
        this.navigate(this.currentRoute, true)
        this.checkHealth()
      }
    })

    // Mobile sidebar toggle
    document.addEventListener("click", (e) => {
      const toggleBtn = e.target.closest("#mobile-sidebar-toggle")
      if (toggleBtn) {
        const sidebar = document.getElementById("sidebar")
        if (sidebar) {
          sidebar.classList.toggle("open")
        }
      } else if (!e.target.closest("#sidebar")) {
        const sidebar = document.getElementById("sidebar")
        if (sidebar && sidebar.classList.contains("open")) {
          sidebar.classList.remove("open")
        }
      }
    })
  }

  async checkHealth() {
    const offlineBanner = document.getElementById("offline-banner")
    const headerDot = document.getElementById("header-status-dot")
    const headerText = document.getElementById("header-conn-text")
    const sidebarDot = document.getElementById("sidebar-status-dot")
    const sidebarText = document.getElementById("sidebar-status-text")

    try {
      const res = await api.healthCheck()
      if (res.success) {
        this.isConnected = true
        if (offlineBanner) offlineBanner.classList.add("hidden")
        if (headerDot) headerDot.className = "status-dot status-dot-connected"
        if (headerText) headerText.textContent = "API Connected"
        if (sidebarDot) sidebarDot.className = "status-dot status-dot-connected"
        if (sidebarText) sidebarText.textContent = "Backend Connected"
      } else {
        throw new Error(res.message || "Invalid health response")
      }
    } catch (err) {
      this.isConnected = false
      if (offlineBanner) offlineBanner.classList.remove("hidden")
      if (headerDot) headerDot.className = "status-dot status-dot-offline"
      if (headerText) headerText.textContent = "API Offline"
      if (sidebarDot) sidebarDot.className = "status-dot status-dot-offline"
      if (sidebarText) sidebarText.textContent = "Backend Offline"
    }
  }

  async navigate(route, forceRefresh = false) {
    if (!route) route = "overview"

    if (this.currentRoute === route && !forceRefresh && this.activePageInstance) {
      return
    }

    this.currentRoute = route

    // Update active nav link
    document.querySelectorAll(".nav-link").forEach((link) => {
      if (link.getAttribute("data-route") === route) {
        link.classList.add("active")
      } else {
        link.classList.remove("active")
      }
    })

    // Update header breadcrumbs
    const headerContainer = document.getElementById("header-container")
    const breadcrumbLabel = this.getRouteLabel(route)
    if (headerContainer) {
      headerContainer.innerHTML = renderHeader(breadcrumbLabel, [breadcrumbLabel])
    }

    const viewEl = document.getElementById("app-view")
    if (!viewEl) return

    // Instantiate active page
    switch (route) {
      case "overview":
        this.activePageInstance = new DashboardPage(viewEl)
        break
      case "embed":
        this.activePageInstance = new EmbedPage(viewEl)
        break
      case "vectors":
        this.activePageInstance = new VectorsPage(viewEl)
        break
      case "query":
        this.activePageInstance = new QueryPage(viewEl)
        break
      case "hnsw":
        this.activePageInstance = new HNSWPage(viewEl)
        break
      case "rag":
        this.activePageInstance = new RAGPage(viewEl)
        break
      case "similarity":
        this.activePageInstance = new SimilarityPage(viewEl)
        break
      default:
        this.activePageInstance = new DashboardPage(viewEl)
        break
    }

    // Render the page
    if (this.activePageInstance) {
      await this.activePageInstance.render()
    }
  }

  getRouteLabel(route) {
    switch (route) {
      case "overview":
        return "Overview"
      case "embed":
        return "Embed Data"
      case "vectors":
        return "Vector Explorer"
      case "query":
        return "Query Playground"
      case "hnsw":
        return "HNSW Graph"
      case "rag":
        return "RAG Playground"
      case "similarity":
        return "Similarity Explorer"
      default:
        return "Overview"
    }
  }
}

// Bootstrap Application on DOMContentLoaded
document.addEventListener("DOMContentLoaded", () => {
  const app = new App()
  app.init()
})
