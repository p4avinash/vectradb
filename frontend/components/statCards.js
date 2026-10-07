/**
 * VectraDB Explorer - Minimalist Statistic Cards Component
 */

export function renderStatCards(stats = {}) {
  const cards = [
    {
      title: "Total Vectors",
      value: stats.totalVectors ?? "0",
      badge: "In Memory",
      color: "indigo",
    },
    {
      title: "Dimension",
      value: stats.dimension ? `${stats.dimension}D` : "384D",
      badge: "Dense",
      color: "cyan",
    },
    {
      title: "Documents",
      value: stats.totalDocuments ?? "0",
      badge: "Ingested",
      color: "emerald",
    },
    {
      title: "HNSW Nodes",
      value: stats.hnswNodes ?? "0",
      badge: stats.hnswMaxLevel >= 0 ? `Max Lvl ${stats.hnswMaxLevel}` : "Active",
      color: "amber",
    },
    {
      title: "Embedding Model",
      value: "multilingual-e5-small",
      badge: "Xenova",
      color: "purple",
      isModel: true,
    },
    {
      title: "Storage Engine",
      value: "JSON Storage",
      badge: "Synced",
      color: "blue",
    },
  ]

  return `
    <div class="stat-grid">
      ${cards
        .map(
          (card) => `
        <div class="stat-card">
          <div class="stat-card-header">
            <span class="stat-card-title">${card.title}</span>
            <span class="stat-badge stat-badge-${card.color}">${card.badge}</span>
          </div>
          <div class="stat-card-body">
            <div class="stat-card-value ${card.isModel ? "stat-card-value-sm" : ""}">${card.value}</div>
          </div>
        </div>
      `,
        )
        .join("")}
    </div>
  `
}
