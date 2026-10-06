function errorHandler(error, req, res, next) {
  console.error(error)

  let statusCode = error.statusCode || 500

  if (
    error.message.includes("required") ||
    error.message.includes("must be") ||
    error.message.includes("cannot be") ||
    error.message.includes("already exists")
  ) {
    statusCode = 400
  }

  res.status(statusCode).json({
    success: false,
    message: error.message || "Internal server error",
  })
}

module.exports = errorHandler
