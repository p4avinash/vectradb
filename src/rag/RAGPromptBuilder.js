class RAGPromptBuilder {
  build({ question, context }) {
    if (typeof question !== "string" || question.trim() === "") {
      throw new Error("Question must be a non-empty string")
    }

    if (typeof context !== "string" || context.trim() === "") {
      throw new Error("Context must be a non-empty string")
    }

    return `You are a helpful assistant.

Answer the user's question using only the provided context.

If the answer cannot be found in the context, say:
"I don't have enough information in the provided context."

Do not invent or assume information that is not present in the context.

Context:
${context}

Question:
${question}

Answer:`
  }
}

module.exports = RAGPromptBuilder
