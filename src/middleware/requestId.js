const { randomUUID } = require('crypto');

/**
 * Attaches a unique X-Request-Id to every request and response.
 * Reuses the client-supplied header if present (useful for distributed tracing).
 */
const requestId = (req, res, next) => {
  const id = req.headers['x-request-id'] || randomUUID();
  req.requestId = id;
  res.setHeader('X-Request-Id', id);
  next();
};

module.exports = requestId;
