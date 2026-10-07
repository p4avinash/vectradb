/**
 * VectraDB Explorer - Sidebar Navigation Component
 */

export const NAV_ITEMS = [
  {
    id: "overview",
    label: "Overview",
    icon: `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="3" width="7" height="7"></rect><rect x="14" y="3" width="7" height="7"></rect><rect x="14" y="14" width="7" height="7"></rect><rect x="3" y="14" width="7" height="7"></rect></svg>`,
    badge: null,
  },
  {
    id: "embed",
    label: "Embed Data",
    icon: `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path><polyline points="14 2 14 8 20 8"></polyline><line x1="12" y1="18" x2="12" y2="12"></line><line x1="9" y1="15" x2="15" y2="15"></line></svg>`,
    badge: "Ingest",
  },
  {
    id: "vectors",
    label: "Vector Explorer",
    icon: `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"></path><polyline points="3.27 6.96 12 12.01 20.73 6.96"></polyline><line x1="12" y1="22.08" x2="12" y2="12"></line></svg>`,
    badge: "CRUD",
  },
  {
    id: "query",
    label: "Query Playground",
    icon: `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="11" cy="11" r="8"></circle><line x1="21" y1="21" x2="16.65" y2="16.65"></line></svg>`,
    badge: "PCA 2D",
  },
  {
    id: "hnsw",
    label: "HNSW Graph",
    icon: `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="18" cy="5" r="3"></circle><circle cx="6" cy="12" r="3"></circle><circle cx="18" cy="19" r="3"></circle><line x1="8.59" y1="13.51" x2="15.42" y2="17.49"></line><line x1="15.41" y1="6.51" x2="8.59" y2="10.49"></line></svg>`,
    badge: "Layers",
  },
  {
    id: "rag",
    label: "RAG Playground",
    icon: `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"></path><path d="M8 9h8"></path><path d="M8 13h6"></path></svg>`,
    badge: "Groq LLM",
  },
  {
    id: "similarity",
    label: "Similarity Explorer",
    icon: `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"></circle><path d="m4.93 4.93 4.24 4.24"></path><path d="m14.83 9.17 4.24-4.24"></path><path d="m14.83 14.83 4.24 4.24"></path><path d="m9.17 14.83-4.24 4.24"></path></svg>`,
    badge: "Math",
  },
]

export function renderSidebar(activeRoute = "overview") {
  return `
    <aside class="sidebar" id="sidebar">
      <div class="sidebar-brand">
        <div class="brand-logo">
          <div class="logo-gem">
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <polygon points="12 2 2 7 12 12 22 7 12 2"></polygon>
              <polyline points="2 17 12 22 22 17"></polyline>
              <polyline points="2 12 12 17 22 12"></polyline>
            </svg>
          </div>
          <div class="brand-text">
            <span class="brand-name">Vectra<span class="brand-highlight">DB</span></span>
            <span class="brand-badge">EXPLORER</span>
          </div>
        </div>
      </div>

      <nav class="sidebar-nav">
        <div class="nav-section-title">EXPLORATION & TOOLS</div>
        <ul class="nav-list">
          ${NAV_ITEMS.map((item) => `
            <li class="nav-item">
              <a href="#${item.id}" class="nav-link ${item.id === activeRoute ? "active" : ""}" data-route="${item.id}">
                <span class="nav-icon">${item.icon}</span>
                <span class="nav-label">${item.label}</span>
                ${item.badge ? `<span class="nav-tag">${item.badge}</span>` : ""}
              </a>
            </li>
          `).join("")}
        </ul>
      </nav>

      <div class="sidebar-footer">
        <div class="server-status-card">
          <div class="status-indicator">
            <span class="status-dot status-dot-connected" id="sidebar-status-dot"></span>
            <span class="status-text font-mono" id="sidebar-status-text">Backend Connected</span>
          </div>
          <div class="status-url font-mono" id="sidebar-status-url">http://localhost:3000</div>
        </div>
      </div>
    </aside>
  `
}
