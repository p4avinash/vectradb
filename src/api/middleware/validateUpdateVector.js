function validateUpdateVector(req, res, next) {
  const { vector, metadata } = req.body

  if (vector !== undefined) {
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
  }

  if (metadata !== undefined) {
    if (
      typeof metadata !== "object" ||
      metadata === null ||
      Array.isArray(metadata)
    ) {
      return res.status(400).json({
        success: false,
        message: "Metadata must be an object",
      })
    }
  }

  next()
}

module.exports = validateUpdateVector
