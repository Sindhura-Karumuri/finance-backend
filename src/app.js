require('dotenv').config();
const express      = require('express');
const swaggerUi    = require('swagger-ui-express');
const swaggerSpec  = require('./config/swagger');
const requestId    = require('./middleware/requestId');
const errorHandler = require('./middleware/errorHandler');

const app = express();

app.use(express.json());
app.use(requestId);

// Interactive API docs
app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerSpec, {
  customSiteTitle: 'Finance API Docs',
  swaggerOptions: { persistAuthorization: true },
}));

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
