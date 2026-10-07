/**
 * VectraDB Explorer - Overview / Dashboard Page (Minimalist)
 */

import { api } from "../api.js"
import { renderStatCards } from "../components/statCards.js"
import { renderPipeline, attachPipelineEvents } from "../components/pipeline.js"
import { toast } from "../components/toast.js"
import { escapeHtml } from "../utils/formatters.js"

export class DashboardPage {
  constructor(container) {
    this.container = container
    this.stats = null
  }

  async render() {
    this.container.innerHTML = `
      <div class="page-container fade-in">
        <div class="page-header">
          <div>
            <h1 class="page-title">Overview</h1>
            <p class="page-subtitle">Database state and end-to-end architecture pipeline</p>
          </div>
          <div class="header-actions">
            <a href="#embed" class="btn btn-primary btn-sm">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="12" y1="5" x2="12" y2="19"></line><line x1="5" y1="12" x2="19" y2="12"></line></svg>
              Embed Document
            </a>
            <a href="#query" class="btn btn-secondary btn-sm">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="11" cy="11" r="8"></circle><line x1="21" y1="21" x2="16.65" y2="16.65"></line></svg>
              Query Playground
            </a>
          </div>
        </div>

        <!-- Metric Stat Cards -->
        <div id="overview-stat-cards">
          <div class="loading-state">
            <div class="spinner"></div>
            <span>Fetching real-time stats...</span>
          </div>
        </div>

        <!-- Interactive Architecture Pipeline -->
        <div class="dashboard-section" id="overview-pipeline-container">
          ${renderPipeline("embedding")}
        </div>
      </div>
    `

    // Attach pipeline interactive events
    const pipelineContainer = this.container.querySelector("#overview-pipeline-container")
    if (pipelineContainer) {
      attachPipelineEvents(pipelineContainer)
    }

    // Load real live statistics
    await this.loadStats()
  }

  async loadStats() {
    try {
      const res = await api.getStats()
      if (res.success && res.data) {
        this.stats = res.data
        const statCardsContainer = this.container.querySelector("#overview-stat-cards")
        if (statCardsContainer) {
          statCardsContainer.innerHTML = renderStatCards(this.stats)
        }
      }
    } catch (err) {
      const statCardsContainer = this.container.querySelector("#overview-stat-cards")
      if (statCardsContainer) {
        statCardsContainer.innerHTML = `
          <div class="error-banner">
            <strong>Failed to connect to backend:</strong> ${escapeHtml(err.message)}
            <br/><span class="text-muted">Ensure the Express server is running on http://localhost:3000</span>
          </div>
        `
      }
      toast.error(`Backend connection error: ${err.message}`)
    }
  }
}
