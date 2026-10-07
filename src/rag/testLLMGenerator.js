require("dotenv").config()

const LLMGenerator = require("./LLMGenerator")

async function main() {
  const llm = new LLMGenerator()

  const prompt = `
You are a helpful assistant.

Answer the question using only the provided context.

Context:
React is a JavaScript library for building user interfaces.
React applications are composed of reusable components.

Question:
What is React used for?

Answer:
`

  const answer = await llm.generate(prompt)

  console.log("=== LLM Answer ===\n")

  console.log(answer)
}

main().catch((error) => {
  console.error("LLM test failed:")
  console.error(error)
})
