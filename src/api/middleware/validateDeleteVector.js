function validateDeleteVector(req, res, next) {
  const { id } = req.params

  if (!id || id.trim() === "") {
    return res.status(400).json({
      success: false,
      message: "Vector ID is required",
    })
  }

  next()
}

module.exports = validateDeleteVector
