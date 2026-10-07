const TextChunker = require("./TextChunker")

function test(name, callback) {
  try {
    callback()

    console.log(`❌ ${name}`)
    console.log("   Expected an error, but none occurred\n")
  } catch (error) {
    console.log(`✅ ${name}`)
    console.log(`   ${error.message}\n`)
  }
}

function main() {
  console.log("=== Chunker Validation Tests ===\n")

  test("chunkSize = 0", () => {
    new TextChunker({
      chunkSize: 0,
      overlap: 0,
    })
  })

  test("chunkSize is negative", () => {
    new TextChunker({
      chunkSize: -10,
      overlap: 0,
    })
  })

  test("chunkSize is not an integer", () => {
    new TextChunker({
      chunkSize: 10.5,
      overlap: 2,
    })
  })

  test("overlap is negative", () => {
    new TextChunker({
      chunkSize: 10,
      overlap: -1,
    })
  })

  test("overlap >= chunkSize", () => {
    new TextChunker({
      chunkSize: 10,
      overlap: 10,
    })
  })

  test("empty text", () => {
    const chunker = new TextChunker({
      chunkSize: 10,
      overlap: 2,
    })

    chunker.chunk("")
  })

  test("whitespace-only text", () => {
    const chunker = new TextChunker({
      chunkSize: 10,
      overlap: 2,
    })

    chunker.chunk("   ")
  })

  test("non-string text", () => {
    const chunker = new TextChunker({
      chunkSize: 10,
      overlap: 2,
    })

    chunker.chunk(12345)
  })
}

try {
  main()
} catch (error) {
  console.error("Validation test failed:")

  console.error(error)
}
