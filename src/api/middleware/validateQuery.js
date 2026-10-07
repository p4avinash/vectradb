function validateQuery(req, res, next) {
  const { question, topK, threshold } = req.body

  if (typeof question !== "string" || question.trim() === "") {
    return res.status(400).json({
      success: false,
      message: "question must be a non-empty string",
    })
  }

  if (topK !== undefined && (!Number.isInteger(topK) || topK <= 0)) {
    return res.status(400).json({
      success: false,
      message: "topK must be a positive integer",
    })
  }

  if (
    threshold !== undefined &&
    (typeof threshold !== "number" || threshold < -1 || threshold > 1)
  ) {
    return res.status(400).json({
      success: false,
      message: "threshold must be a number between -1 and 1",
    })
  }

  next()
}

module.exports = validateQuery
