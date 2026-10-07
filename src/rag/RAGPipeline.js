class RAGPipeline {
  constructor({ retriever, contextBuilder, promptBuilder, llmGenerator }) {
    if (!retriever) {
      throw new Error("Retriever is required")
    }

    if (!contextBuilder) {
      throw new Error("ContextBuilder is required")
    }

    if (!promptBuilder) {
      throw new Error("PromptBuilder is required")
    }

    if (!llmGenerator) {
      throw new Error("LLMGenerator is required")
    }

    this.retriever = retriever
    this.contextBuilder = contextBuilder
    this.promptBuilder = promptBuilder
    this.llmGenerator = llmGenerator
  }

  async ask(query, topK = 5) {
    if (typeof query !== "string" || query.trim() === "") {
      throw new Error("Query must be a non-empty string")
    }

    const results = await this.retriever.retrieve(query, topK)

    if (results.length === 0) {
      return {
        answer: "I don't have enough information in the provided context.",
        results: [],
        context: "",
      }
    }

    const context = this.contextBuilder.build(results)

    const prompt = this.promptBuilder.build({
      question: query,
      context,
    })

    const answer = await this.llmGenerator.generate(prompt)

    return {
      answer,
      results,
      context,
    }
  }
}

module.exports = RAGPipeline
