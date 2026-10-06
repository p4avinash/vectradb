const fs = require("fs")
const path = require("path")

class HNSWStorage {
  constructor(filePath) {
    this.filePath = filePath
  }

  save(data) {
    const directory = path.dirname(this.filePath)

    fs.mkdirSync(directory, {
      recursive: true,
    })

    fs.writeFileSync(this.filePath, JSON.stringify(data, null, 2), "utf-8")
  }

  load() {
    if (!fs.existsSync(this.filePath)) {
      return null
    }

    const content = fs.readFileSync(this.filePath, "utf-8")

    return JSON.parse(content)
  }
}

module.exports = HNSWStorage
