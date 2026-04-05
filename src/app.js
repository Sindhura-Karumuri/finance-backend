require('dotenv').config();
const express    = require('express');
const requestId  = require('./middleware/requestId');
const errorHandler = require('./middleware/errorHandler');

const app = express();

app.use(express.json());
app.use(requestId); // attach X-Request-Id to every request/response

// Health check
app.get('/health', (_, res) =>
  res.json({ status: 'UP', time: new Date().toISOString() })
);

// API routes
app.use('/api', require('./routes'));

// 404 for unknown API paths
app.use('/api', (req, res) => {
  res.status(404).json({
    success: false,
    message: `Route ${req.method} ${req.originalUrl} not found`,
  });
});

app.use(errorHandler);

const PORT = process.env.PORT || 3000;
app.listen(PORT, () =>
  console.log(`Server running on port ${PORT} [${process.env.NODE_ENV}]`)
);

module.exports = app;
