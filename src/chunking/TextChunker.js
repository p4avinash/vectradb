class TextChunker {
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
      const end = Math.min(start + this.chunkSize, text.length)

      const chunkText = text.slice(start, end)

      chunks.push({
        index,
        text: chunkText,
      })

      index += 1

      if (end === text.length) {
        break
      }

      start = end - this.overlap
    }

    return chunks
  }
}

module.exports = TextChunker
