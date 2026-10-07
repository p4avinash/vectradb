function validateDocument(req, res, next) {
  const { documentId, text, source } = req.body

  if (typeof documentId !== "string" || documentId.trim() === "") {
    return res.status(400).json({
      success: false,
      message: "documentId is required",
    })
  }

  if (typeof text !== "string" || text.trim() === "") {
    return res.status(400).json({
      success: false,
      message: "text must be a non-empty string",
    })
  }

  if (source !== undefined && source !== null && typeof source !== "string") {
    return res.status(400).json({
      success: false,
      message: "source must be a string",
    })
  }

  next()
}

module.exports = validateDocument
