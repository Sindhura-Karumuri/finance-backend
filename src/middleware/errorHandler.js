/**
 * Global error handler.
 * Includes X-Request-Id in error body for easy log correlation.
 */
const errorHandler = (err, req, res, _next) => {
  console.error(`[ERROR] [${req.requestId}] ${req.method} ${req.path}:`, err.message);

  if (err.code === 'P2025') {
    return res.status(404).json({ success: false, message: 'Resource not found', requestId: req.requestId });
  }
  if (err.code === 'P2002') {
    return res.status(409).json({ success: false, message: 'Resource already exists', requestId: req.requestId });
  }

  const status = err.status || 500;
  res.status(status).json({
    success: false,
    message: err.message || 'Internal server error',
    requestId: req.requestId,
  });
};

module.exports = errorHandler;
