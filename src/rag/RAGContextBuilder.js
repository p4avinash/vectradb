class RAGContextBuilder {
  build(results) {
    if (!Array.isArray(results)) {
      throw new Error("Results must be an array")
    }

    if (results.length === 0) {
      return ""
    }

    return results
      .map((result, index) => {
        return [
          `Source ${index + 1}: ${result.metadata.source}`,
          `Chunk: ${result.metadata.chunkIndex}`,
          `Score: ${result.score}`,
          "",
          result.text,
        ].join("\n")
      })
      .join("\n\n---\n\n")
  }
}

module.exports = RAGContextBuilder
