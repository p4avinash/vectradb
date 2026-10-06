class MaxHeap {
  constructor(compare) {
    this.items = []
    this.compare = compare
  }

  get size() {
    return this.items.length
  }

  isEmpty() {
    return this.items.length === 0
  }

  peek() {
    return this.items[0] || null
  }

  push(item) {
    this.items.push(item)

    this.bubbleUp(this.items.length - 1)
  }

  pop() {
    if (this.items.length === 0) {
      return null
    }

    if (this.items.length === 1) {
      return this.items.pop()
    }

    const top = this.items[0]

    this.items[0] = this.items.pop()

    this.bubbleDown(0)

    return top
  }

  bubbleUp(index) {
    while (index > 0) {
      const parentIndex = Math.floor((index - 1) / 2)

      if (this.compare(this.items[index], this.items[parentIndex]) <= 0) {
        break
      }

      this.swap(index, parentIndex)

      index = parentIndex
    }
  }

  bubbleDown(index) {
    const length = this.items.length

    while (true) {
      const left = index * 2 + 1

      const right = index * 2 + 2

      let largest = index

      if (
        left < length &&
        this.compare(this.items[left], this.items[largest]) > 0
      ) {
        largest = left
      }

      if (
        right < length &&
        this.compare(this.items[right], this.items[largest]) > 0
      ) {
        largest = right
      }

      if (largest === index) {
        break
      }

      this.swap(index, largest)

      index = largest
    }
  }

  swap(i, j) {
    const temp = this.items[i]

    this.items[i] = this.items[j]

    this.items[j] = temp
  }

  toArray() {
    return [...this.items]
  }
}

module.exports = MaxHeap
