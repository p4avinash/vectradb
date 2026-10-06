function validateVector(req, res, next) {
  const { id, vector } = req.body

  if (!id) {
    return res.status(400).json({
      success: false,
      message: "Vector ID is required",
    })
  }

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

  next()
}

module.exports = validateVector
