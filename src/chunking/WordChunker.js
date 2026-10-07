class WordChunker {
  constructor({ chunkSize = 500, overlap = 50 } = {}) {
    if (!Number.isInteger(chunkSize) || chunkSize <= 0) {
      throw new Error("chunkSize must be a positive integer")
    }

    if (!Number.isInteger(overlap) || overlap < 0) {
      throw new Error("overlap must be a non-negative integer")
    }

    if (overlap >= chunkSize) {
      throw new Error("overlap must be smaller than chunkSize")
    }

    this.chunkSize = chunkSize
    this.overlap = overlap
  }

  chunk(text) {
    if (typeof text !== "string" || text.trim() === "") {
      throw new Error("Text must be a non-empty string")
    }

    const chunks = []

    let start = 0
    let index = 0

    while (start < text.length) {
      let end = Math.min(start + this.chunkSize, text.length)

      if (end < text.length) {
        const whitespaceIndex = text.lastIndexOf(" ", end)

        const newlineIndex = text.lastIndexOf("\n", end)

        end = Math.max(whitespaceIndex, newlineIndex)

        if (end <= start) {
          end = Math.min(start + this.chunkSize, text.length)
        }
      }

      const chunkText = text.slice(start, end).trim()

      if (chunkText.length > 0) {
        chunks.push({
          index,
          text: chunkText,
        })

        index += 1
      }

      if (end >= text.length) {
        break
      }

      // Start approximately `overlap`
      // characters before the chunk end.
      let nextStart = Math.max(start, end - this.overlap)

      // Move backward to the beginning
      // of the current word.
      while (nextStart > start && !/\s/.test(text[nextStart - 1])) {
        nextStart -= 1
      }

      // Skip whitespace before the word.
      while (nextStart < end && /\s/.test(text[nextStart])) {
        nextStart += 1
      }

      start = nextStart
    }

    return chunks
  }
}

module.exports = WordChunker
