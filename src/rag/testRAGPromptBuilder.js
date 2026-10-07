const RAGPromptBuilder = require("./RAGPromptBuilder")

function main() {
  const context = `
Source 1: react-guide.txt
Chunk: 0
Score: 0.9137

React is a JavaScript library for building user interfaces.

---

Source 2: react-guide.txt
Chunk: 1
Score: 0.8922

React applications are composed of reusable components.
`

  const question = "What is React used for?"

  const promptBuilder = new RAGPromptBuilder()

  const prompt = promptBuilder.build({
    question,
    context,
  })

  console.log("=== RAG Prompt ===\n")

  console.log(prompt)
}

try {
  main()
} catch (error) {
  console.error("RAG prompt test failed:")

  console.error(error)
}
