const Groq = require("groq-sdk")

class LLMGenerator {
  constructor({
    apiKey = process.env.GROQ_API_KEY,
    model = "openai/gpt-oss-120b",
  } = {}) {
    if (!apiKey) {
      throw new Error("GROQ_API_KEY is required")
    }

    this.client = new Groq({
      apiKey,
    })

    this.model = model
  }

  async generate(prompt) {
    if (typeof prompt !== "string" || prompt.trim() === "") {
      throw new Error("Prompt must be a non-empty string")
    }

    const completion = await this.client.chat.completions.create({
      model: this.model,

      messages: [
        {
          role: "user",
          content: prompt,
        },
      ],

      temperature: 0,
    })

    return completion.choices[0].message.content
  }
}

module.exports = LLMGenerator
