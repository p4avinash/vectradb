/**
 * VectraDB Explorer - Application Header Component
 */

export function renderHeader(pageTitle = "Overview", breadcrumbs = ["Dashboard"]) {
  return `
    <header class="app-header">
      <div class="header-left">
        <button class="mobile-toggle-btn" id="mobile-sidebar-toggle" aria-label="Toggle navigation">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <line x1="3" y1="12" x2="21" y2="12"></line>
            <line x1="3" y1="6" x2="21" y2="6"></line>
            <line x1="3" y1="18" x2="21" y2="18"></line>
          </svg>
        </button>
        <div class="header-breadcrumbs">
          <span class="crumb-root">VectraDB</span>
          <span class="crumb-sep">/</span>
          ${breadcrumbs.map((crumb) => `<span class="crumb-item">${crumb}</span>`).join('<span class="crumb-sep">/</span>')}
        </div>
      </div>

      <div class="header-right">
        <div class="connection-badge" id="header-conn-badge">
          <span class="status-dot status-dot-connected" id="header-status-dot"></span>
          <span class="connection-label font-mono" id="header-conn-text">API Connected</span>
        </div>

        <button class="btn btn-icon" id="header-refresh-btn" title="Refresh data">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <polyline points="23 4 23 10 17 10"></polyline>
            <polyline points="1 20 1 14 7 14"></polyline>
            <path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15"></path>
          </svg>
        </button>
      </div>
    </header>
  `
}
