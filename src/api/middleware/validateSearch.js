function validateSearch(req, res, next) {
  const { vector, topK = 5, threshold = 0 } = req.body

  if (!Array.isArray(vector)) {
    return res.status(400).json({
      success: false,
      message: "Vector must be an array",
    })
  }

  if (vector.length === 0) {
    return res.status(400).json({
      success: false,
      message: "Vector cannot be empty",
    })
  }

  if (!Number.isInteger(topK) || topK <= 0) {
    return res.status(400).json({
      success: false,
      message: "topK must be a positive integer",
    })
  }

  if (typeof threshold !== "number") {
    return res.status(400).json({
      success: false,
      message: "threshold must be a number",
    })
  }

  next()
}

module.exports = validateSearch
