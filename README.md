# VectraDB

A lightweight, educational vector database built from scratch in JavaScript, with local embeddings, HNSW approximate nearest-neighbor search, persistence, and a complete RAG pipeline powered by an LLM.

The main goal of this project is to understand **how a vector database and RAG system work internally**, instead of simply using an existing vector database.

---

## Features

### Vector Database

- Vector representation and storage
- Fixed vector-dimension validation
- Insert / Get / Update / Delete
- Cosine similarity
- Top-K similarity search
- Relevance threshold filtering
- Metadata storage
- JSON-based persistence

### Embedding Pipeline

- Local text embeddings using Transformers.js
- Model: `Xenova/multilingual-e5-small`
- No paid embedding API required
- Query/document embedding support
- 384-dimensional embeddings
- Batch embedding support
- Embedding dimension validation

### Document Processing

- Text chunking
- Word-boundary-aware chunking
- Configurable chunk size
- Configurable overlap
- Chunk metadata:
  - document ID
  - source
  - chunk index
- Chunk → Embedding → VectorStore pipeline

### HNSW Index

VectraDB contains a from-scratch implementation of:

**HNSW — Hierarchical Navigable Small World**

It includes:

- Multiple graph layers
- Entry point management
- Random level assignment
- Neighbor connections
- Bidirectional graph relationships
- `M` neighbor limit
- `efConstruction`
- `efSearch`
- Greedy search through layers
- Candidate/result heaps
- Insert
- Search
- Update
- Delete
- Persistence
- Brute-force comparison/benchmarking

The implementation is intentionally educational so that the internal ANN search process can be understood.

### RAG

Complete Retrieval-Augmented Generation pipeline:

```text
User Question
      ↓
Query Embedding
      ↓
HNSW Vector Search
      ↓
Top-K Relevant Chunks
      ↓
Context Builder
      ↓
Prompt Builder
      ↓
LLM
      ↓
Final Answer
```

The RAG pipeline includes:

- Semantic retrieval
- Context construction
- Source/chunk information
- Prompt generation
- LLM answer generation
- Source information in API response

### HTTP API

Express API for:

- Health check
- Document ingestion
- Vector CRUD
- Vector similarity search
- RAG queries

---

# Architecture

At a high level:

```text
                         ┌──────────────────┐
                         │   Express API    │
                         └────────┬─────────┘
                                  │
              ┌───────────────────┴───────────────────┐
              │                                       │
              ▼                                       ▼
      Document Ingestion                         RAG Query
              │                                       │
              ▼                                       ▼
         Word Chunker                            Embedding Model
              │                                       │
              ▼                                       ▼
       Chunk Metadata                              HNSW Search
              │                                       │
              ▼                                       ▼
       Chunk Embedding                         Top-K Chunks
              │                                       │
              ▼                                       ▼
         VectorStore                           Context Builder
              │                                       │
              ▼                                       ▼
         HNSW Index                              Prompt Builder
              │                                       │
              ▼                                       ▼
        JSON Persistence                         Groq LLM
                                                      │
                                                      ▼
                                                 Final Answer
```

---

# How VectraDB Works

## 1. Store a Vector

Every vector is stored with:

```text
id
vector
metadata
```

Example:

```json
{
  "id": "react-doc",
  "vector": [0.12, 0.34, 0.56],
  "metadata": {
    "source": "react-guide.txt"
  }
}
```

VectraDB validates that all vectors have the same dimension.

---

## 2. Semantic Search

A query is converted into an embedding vector.

VectraDB then compares the query vector against stored vectors using cosine similarity.

Conceptually:

```text
Query Vector
      ↓
Similarity calculation
      ↓
Score for every candidate
      ↓
Sort by similarity
      ↓
Top-K results
```

Higher similarity means the vectors are more semantically similar.

---

## 3. HNSW Search

Instead of comparing the query against every vector every time, VectraDB can use the HNSW index.

The search starts from an entry point in a higher layer and moves toward increasingly similar vectors.

Conceptually:

```text
Layer 2        A -------- D
                \
                 \
Layer 1     A --- B ----- D ---- F
                 /
                /
Layer 0    A - B - C - D - E - F - G
```

The upper layers provide long-range navigation while the bottom layer contains the denser graph.

### `M`

Maximum number of neighbors maintained by a node per layer.

### `efConstruction`

Controls how extensively the graph is explored while building the index.

Higher values can improve graph quality but increase construction cost.

### `efSearch`

Controls how many candidates are explored during a search.

Higher values generally improve recall but increase search work.

---

# Why HNSW?

A simple vector database can perform brute-force search:

```text
Query
  ↓
Compare with vector 1
Compare with vector 2
Compare with vector 3
...
Compare with vector N
  ↓
Sort results
```

This is simple but becomes expensive as the number of vectors grows.

HNSW provides an approximate nearest-neighbor approach:

```text
Query
  ↓
High-level graph navigation
  ↓
Narrow candidate region
  ↓
Detailed lower-level search
  ↓
Top-K approximate nearest neighbors
```

VectraDB keeps brute-force search as the conceptual ground truth so HNSW behavior can be compared against exact search.

---

# Embedding Model

VectraDB uses:

```text
Xenova/multilingual-e5-small
```

through:

```text
@huggingface/transformers
```

The model runs locally.

No OpenAI embedding API or paid embedding service is required.

For documents:

```text
passage: <document text>
```

For queries:

```text
query: <user question>
```

The model produces a **384-dimensional vector**.

Example:

```text
"React is used to build UIs"
              ↓
       Embedding Model
              ↓
[0.012, -0.083, 0.241, ...]
              ↓
         384 values
```

---

# Document Ingestion

When a document is sent to:

```http
POST /documents
```

the following pipeline runs:

```text
Raw Document
     ↓
Validation
     ↓
Word Chunking
     ↓
Chunk Metadata
     ↓
Embedding
     ↓
VectorStore
     ↓
HNSW Index
     ↓
JSON Persistence
```

Each chunk gets metadata such as:

```json
{
  "documentId": "react-guide",
  "chunkIndex": 0,
  "source": "react-guide.txt"
}
```

The original chunk text is also retained so it can later be used by the RAG pipeline.

---

# RAG Pipeline

VectraDB implements a complete basic RAG architecture.

Suppose the user asks:

```text
What is React used for?
```

### Step 1 — Embed the Question

```text
"What is React used for?"
             ↓
       Query embedding
             ↓
       384-dimensional vector
```

### Step 2 — Retrieve Relevant Chunks

The vector is searched through HNSW.

Example:

```text
react-guide-chunk-0     0.91
react-guide-chunk-1     0.89
next-guide-chunk-0      0.86
```

### Step 3 — Build Context

The retrieved chunks are converted into context for the LLM.

### Step 4 — Build the Prompt

The prompt instructs the model to:

- use only the supplied context
- avoid inventing information
- explicitly say when the context is insufficient

### Step 5 — Generate Answer

The context is sent to the LLM.

The current implementation uses:

```text
openai/gpt-oss-120b
```

through Groq.

---

# Persistence

VectraDB currently uses JSON files for persistence.

```text
data/
├── vectors.json
└── hnsw.json
```

`vectors.json` stores the vector records.

`hnsw.json` stores the HNSW graph/index state.

When the server starts, persisted data is loaded again.

If vectors exist but the HNSW index is empty, the application can rebuild the HNSW index from the stored vectors.

Persistence was verified by:

1. Ingesting a document
2. Querying it successfully
3. Restarting the server
4. Querying the same document again
5. Receiving the same relevant result

---

# Project Structure

```text
vectradb/
│
├── data/
│   ├── vectors.json
│   ├── hnsw.json
│   └── test files...
│
├── src/
│   │
│   ├── api/
│   │   ├── middleware/
│   │   │   ├── errorHandler.js
│   │   │   ├── validateDeleteVector.js
│   │   │   ├── validateDocument.js
│   │   │   ├── validateQuery.js
│   │   │   ├── validateSearch.js
│   │   │   ├── validateUpdateVector.js
│   │   │   └── validateVector.js
│   │   │
│   │   └── server.js
│   │
│   ├── app/
│   │   └── DocumentIngestion.js
│   │
│   ├── chunking/
│   │   ├── TextChunker.js
│   │   ├── WordChunker.js
│   │   ├── ChunkMetadata.js
│   │   ├── ChunkEmbedder.js
│   │   └── ChunkVectorStore.js
│   │
│   ├── core/
│   │   ├── VectorStore.js
│   │   └── TextVectorStore.js
│   │
│   ├── embeddings/
│   │   └── EmbeddingModel.js
│   │
│   ├── index/
│   │   ├── HNSWNode.js
│   │   ├── HNSWIndex.js
│   │   ├── MaxHeap.js
│   │   └── MinHeap.js
│   │
│   ├── rag/
│   │   ├── RAGRetriever.js
│   │   ├── RAGContextBuilder.js
│   │   ├── RAGPromptBuilder.js
│   │   ├── LLMGenerator.js
│   │   └── RAGPipeline.js
│   │
│   ├── similarity/
│   │   └── cosineSimilarity.js
│   │
│   └── storage/
│       ├── JsonStorage.js
│       └── HNSWStorage.js
│
├── package.json
├── package-lock.json
└── README.md
```

---

# Installation

Install dependencies:

```bash
npm install
```

The project uses Node.js and CommonJS modules.

---

# Environment Variables

The RAG pipeline requires a Groq API key for LLM generation.

Create a `.env` file:

```env
GROQ_API_KEY=your_groq_api_key
```

The embedding model itself does **not** require an API key because it runs locally.

---

# Run the Server

Start the development server:

```bash
npm run dev
```

The API runs at:

```text
http://localhost:3000
```

---

# API Usage

## Health Check

### Request

```http
GET /health
```

### Response

```json
{
  "success": true,
  "message": "VectraDB API is running"
}
```

---

# Document Ingestion

## Ingest a Document

### Request

```http
POST /documents
Content-Type: application/json
```

Example body:

```json
{
  "documentId": "react-guide",
  "text": "React is a JavaScript library for building user interfaces. React applications are composed of reusable components. Components can manage their own state and receive data through props. Next.js is a React framework for production web applications.",
  "source": "react-guide.txt"
}
```

### Response

```json
{
  "success": true,
  "data": {
    "documentId": "react-guide",
    "source": "react-guide.txt",
    "chunkCount": 3
  }
}
```

---

# Vector CRUD API

## Insert Vector

```http
POST /vectors
```

Example:

```json
{
  "id": "vector-1",
  "vector": [0.1, 0.2, 0.3],
  "metadata": {
    "source": "test"
  }
}
```

## Get Vector

```http
GET /vectors/vector-1
```

## Update Vector

```http
PUT /vectors/vector-1
```

Example:

```json
{
  "vector": [0.2, 0.3, 0.4],
  "metadata": {
    "source": "updated"
  }
}
```

## Delete Vector

```http
DELETE /vectors/vector-1
```

---

# Vector Search API

```http
POST /vectors/search
```

Example:

```json
{
  "vector": [0.1, 0.2, 0.3],
  "topK": 5,
  "threshold": 0.7
}
```

The search uses the HNSW index and returns the most similar vectors.

---

# RAG Query API

This is the main AI endpoint.

```http
POST /query
```

Example:

```json
{
  "question": "What is React used for?",
  "topK": 3,
  "threshold": 0.7
}
```

Example response:

```json
{
  "success": true,
  "data": {
    "question": "What is React used for?",
    "answer": "React is a JavaScript library used for building user interfaces.",
    "sources": [
      {
        "id": "react-guide-chunk-0",
        "score": 0.9112,
        "source": "react-guide.txt",
        "chunk": 0
      }
    ]
  }
}
```

The response contains:

- the generated answer
- retrieved source chunks
- similarity score
- source name
- chunk number

---

# End-to-End Example

First ingest knowledge:

```text
POST /documents
```

Then ask a question:

```text
POST /query
```

For example:

```text
Document:
"React is a JavaScript library for building user interfaces."

Question:
"What is React used for?"
```

VectraDB performs:

```text
Document
   ↓
Chunk
   ↓
Embedding
   ↓
VectorStore
   ↓
HNSW

Question
   ↓
Query Embedding
   ↓
HNSW Search
   ↓
Relevant Chunk
   ↓
RAG Context
   ↓
Prompt
   ↓
LLM
   ↓
Answer
```

---

# Design Approach

The project deliberately follows a **build-from-first-principles** approach.

Instead of:

```text
Application
    ↓
Pinecone / Weaviate / Chroma
```

the project implements the important building blocks itself:

```text
Application
    ↓
VectraDB
    ├── VectorStore
    ├── Cosine Similarity
    ├── HNSW Index
    ├── Persistence
    ├── Metadata
    ├── Chunking
    ├── Embeddings
    └── RAG
```

The goal is understanding the internal architecture rather than hiding the complexity behind an external vector database.

---

# Why JSON Persistence?

For this educational implementation, JSON was chosen because it is:

- simple
- local
- easy to inspect
- easy to debug
- dependency-light

A production vector database would normally use a more sophisticated storage engine, WAL/recovery strategy, memory management, indexing persistence, and concurrency controls.

---

# Why Local Embeddings?

The project was designed to be low-cost and locally testable.

Therefore:

```text
Embedding
→ Local Transformers.js model

Vector Database
→ Local filesystem

HNSW
→ Implemented from scratch

LLM
→ Groq API
```

Only the final answer-generation step currently requires an external API.

---

# HNSW Benchmark

A small educational benchmark was performed against brute-force search.

Configuration:

```text
Dimension:       8
Vectors:         100
Queries:         5
Top-K:           5
M:               8
efConstruction:  100
efSearch:        50
```

Observed results:

```text
Average Recall@5: 100%

Average brute-force: ~0.256 ms
Average HNSW:        ~0.194 ms

Observed speedup:    ~1.32x
```

This is only a small local benchmark and should **not** be interpreted as production-scale performance evidence.

The important result is that the HNSW implementation matched the brute-force Top-K results for the tested dataset.

---

# Current Scope

Implemented:

- Vector storage
- Vector CRUD
- Cosine similarity
- Top-K search
- Metadata
- Persistence
- Local embeddings
- Chunking
- HNSW ANN index
- HNSW persistence
- Document ingestion
- RAG retrieval
- Context generation
- LLM generation
- Relevance threshold
- Express API

Intentionally skipped:

- LLM tool calling / agentic workflows

Tool calling is not required for the core vector database + RAG architecture, so it was kept outside the main implementation.

---

# Learning Roadmap

The project covered the following concepts:

```text
1.  Vector Representation       ✅
2.  Embedding Pipeline          ✅
3.  Cosine Similarity            ✅
4.  Vector Storage               ✅
5.  CRUD                         ✅
6.  Top-K Retrieval              ✅
7.  Persistence                  ✅
8.  Metadata                     ✅
9.  Chunking                     ✅
10. RAG Pipeline                 ✅
11. LLM Tool Calling             ⏭️
12. Relevance Threshold          ✅
13. HNSW Indexing                ✅
14. Express API                  ✅
15. Final VectraDB + AI          ✅
```

---

# Important Notes

VectraDB is an **educational implementation**, not a production-ready replacement for established vector databases.

The purpose is to understand:

- how vectors are represented
- how embeddings are generated
- how similarity is calculated
- how vector search works
- why ANN indexes are useful
- how HNSW navigates a graph
- how metadata connects vectors back to documents
- how chunking enables document retrieval
- how retrieved context becomes an LLM prompt
- how RAG connects retrieval with generation

---

# Final Architecture

The complete system can be summarized as:

```text
                         VectraDB
                            │
             ┌──────────────┴──────────────┐
             │                             │
       Vector Database                  AI Layer
             │                             │
     ┌───────┼────────┐             ┌──────┴──────┐
     │       │        │             │             │
 VectorStore HNSW  Persistence   Embeddings      RAG
     │       │        │             │             │
     │       │        │             │       ┌─────┴─────┐
     │       │        │             │       │           │
     │       │        │             │    Retrieval   LLM
     │       │        │             │       │           │
     └───────┴────────┘             └───────┴───────────┘
```

**VectraDB = Vector Storage + HNSW Search + Embeddings + RAG + API**
