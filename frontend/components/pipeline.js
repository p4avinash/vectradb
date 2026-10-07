/**
 * VectraDB Explorer - Interactive Pipeline Component
 */

export const PIPELINE_STAGES = [
  {
    id: "document",
    number: "1",
    name: "Document",
    subtitle: "Raw Text Ingestion",
    icon: "📄",
    color: "blue",
    description: "Raw source text or articles are ingested with associated metadata (source name, documentId, tags).",
    details: {
      "Input Format": "UTF-8 String + Metadata",
      "Key Attributes": "documentId, source, text",
      "Example": 'documentId: "react-guide", source: "react.txt"',
    },
  },
  {
    id: "chunking",
    number: "2",
    name: "Chunking",
    subtitle: "Word-Aware Slicing",
    icon: "✂️",
    color: "cyan",
    description: "Splits large text into smaller semantic passages without breaking mid-word, preserving contextual overlap.",
    details: {
      "Algorithm": "WordChunker (Whitespace & newline aware)",
      "Default Chunk Size": "500 characters",
      "Default Overlap": "50 characters",
      "Chunk Metadata": "documentId, chunkIndex, source, text",
    },
  },
  {
    id: "embedding",
    number: "3",
    name: "Embedding",
    subtitle: "Local Transformers",
    icon: "🧬",
    color: "indigo",
    description: "Transforms text chunks into dense 384-dimensional mathematical vectors using a local HuggingFace ONNX model.",
    details: {
      "Model": "Xenova/multilingual-e5-small",
      "Vector Dimension": "384 dense floats",
      "Pooling": "mean pooling + L2 unit normalization",
      "Prefixing": 'Passage: "passage: ...", Query: "query: ..."',
    },
  },
  {
    id: "vector_store",
    number: "4",
    name: "Vector Store",
    subtitle: "In-Memory + Disk Sync",
    icon: "🗄️",
    color: "purple",
    description: "Stores vector embeddings and their metadata in memory for high-speed access and persists them to disk.",
    details: {
      "Primary Structure": "Map<string, { id, vector, metadata }>",
      "Persistence": "JsonStorage (data/vectors.json)",
      "Validation": "Strict 384-dimensional array checking",
      "Operations": "Insert, Get, Update, Delete, Exact Cosine Scan",
    },
  },
  {
    id: "hnsw_index",
    number: "5",
    name: "HNSW Index",
    subtitle: "Hierarchical Graph",
    icon: "🕸️",
    color: "amber",
    description: "Builds a multi-layer graph index for approximate nearest neighbor (ANN) search with logarithmic time complexity.",
    details: {
      "Max Neighbors (M)": "8 (max connections per node per layer)",
      "efConstruction": "100 (exploration factor during insertion)",
      "efSearch": "50 (beam search size during query)",
      "Top Layer": "Sparse highway graph for rapid coarse routing",
      "Base Layer (0)": "Dense interconnected graph for fine nearest neighbor retrieval",
    },
  },
  {
    id: "retrieval",
    number: "6",
    name: "Retrieval",
    subtitle: "Cosine Similarity Top-K",
    icon: "🎯",
    color: "emerald",
    description: "Embeds query text, traverses HNSW layers, and retrieves the top-K highest similarity chunks above the relevance threshold.",
    details: {
      "Similarity Metric": "Cosine Similarity: (A · B) / (||A|| * ||B||)",
      "Cosine Distance": "1 - CosineSimilarity",
      "Threshold Filtering": "Discards candidates below similarity threshold",
      "Default Top-K": "5 nearest neighbors",
    },
  },
  {
    id: "rag_context",
    number: "7",
    name: "RAG Context",
    subtitle: "Context Assembly",
    icon: "📦",
    color: "teal",
    description: "Formats and cleans retrieved chunks into a structured context payload for the LLM prompt.",
    details: {
      "Builder": "RAGContextBuilder",
      "Deduplication": "Removes duplicate chunks",
      "Context Header": "Numbered source snippets with chunk metadata",
    },
  },
  {
    id: "llm",
    number: "8",
    name: "LLM & Answer",
    subtitle: "Groq Generation",
    icon: "🤖",
    color: "rose",
    description: "Feeds the context and question to Groq LLM API with strict grounding instructions to produce factual answers.",
    details: {
      "Model": "openai/gpt-oss-120b (Groq SDK)",
      "Temperature": "0.0 (strictly deterministic)",
      "Safety Instruction": 'Returns "I don\'t have enough information" if context lacks evidence',
    },
  },
]

export function renderPipeline(activeStageId = "embedding") {
  return `
    <div class="pipeline-wrapper">
      <div class="pipeline-header">
        <h3 class="pipeline-title">VectraDB End-to-End Architecture</h3>
        <span class="pipeline-subtitle">Click any stage below to inspect internal parameters</span>
      </div>
      
      <div class="pipeline-container">
        <div class="pipeline-track">
          ${PIPELINE_STAGES.map((stage, idx) => `
            <div class="pipeline-node-wrapper ${stage.id === activeStageId ? "active" : ""}" data-stage="${stage.id}">
              <div class="pipeline-node node-${stage.color}">
                <div class="pipeline-icon">${stage.icon}</div>
                <div class="pipeline-num">${stage.number}</div>
              </div>
              <div class="pipeline-label">
                <span class="pipeline-name">${stage.name}</span>
                <span class="pipeline-sub">${stage.subtitle}</span>
              </div>
            </div>
            ${idx < PIPELINE_STAGES.length - 1 ? `<div class="pipeline-arrow">→</div>` : ""}
          `).join("")}
        </div>
      </div>

      <div class="pipeline-inspector" id="pipeline-inspector">
        ${renderStageDetails(activeStageId)}
      </div>
    </div>
  `
}

export function renderStageDetails(stageId) {
  const stage = PIPELINE_STAGES.find((s) => s.id === stageId) || PIPELINE_STAGES[2]

  return `
    <div class="stage-details-card stage-card-${stage.color}">
      <div class="stage-details-header">
        <div class="stage-badge-group">
          <span class="stage-badge stage-badge-${stage.color}">STAGE ${stage.number}</span>
          <h4 class="stage-heading">${stage.name} — ${stage.subtitle}</h4>
        </div>
        <div class="stage-icon-lg">${stage.icon}</div>
      </div>
      <p class="stage-desc">${stage.description}</p>
      <div class="stage-specs-grid">
        ${Object.entries(stage.details)
          .map(
            ([key, value]) => `
          <div class="stage-spec-item">
            <span class="stage-spec-key">${key}</span>
            <span class="stage-spec-val font-mono">${value}</span>
          </div>
        `,
          )
          .join("")}
      </div>
    </div>
  `
}

export function attachPipelineEvents(container) {
  const nodeWrappers = container.querySelectorAll(".pipeline-node-wrapper")
  const inspectorEl = container.querySelector("#pipeline-inspector")

  nodeWrappers.forEach((node) => {
    node.addEventListener("click", () => {
      nodeWrappers.forEach((n) => n.classList.remove("active"))
      node.classList.add("active")
      const stageId = node.getAttribute("data-stage")
      if (inspectorEl) {
        inspectorEl.innerHTML = renderStageDetails(stageId)
      }
    })
  })
}
