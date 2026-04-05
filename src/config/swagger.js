const swaggerJsdoc = require('swagger-jsdoc');

const options = {
  definition: {
    openapi: '3.0.0',
    info: {
      title: 'Finance Backend API',
      version: '1.0.0',
      description: 'Finance Data Processing and Access Control Backend — role-based API with audit trail',
    },
    servers: [{ url: '/api', description: 'API base' }],
    components: {
      securitySchemes: {
        bearerAuth: {
          type: 'http',
          scheme: 'bearer',
          bearerFormat: 'JWT',
          description: 'Paste your token from POST /auth/login',
        },
      },
      schemas: {
        User: {
          type: 'object',
          properties: {
            id:        { type: 'string' },
            name:      { type: 'string' },
            email:     { type: 'string' },
            role:      { type: 'string', enum: ['VIEWER', 'ANALYST', 'ADMIN'] },
            isActive:  { type: 'boolean' },
            createdAt: { type: 'string', format: 'date-time' },
          },
        },
        FinancialRecord: {
          type: 'object',
          properties: {
            id:       { type: 'string' },
            amount:   { type: 'number' },
            type:     { type: 'string', enum: ['INCOME', 'EXPENSE'] },
            category: { type: 'string' },
            date:     { type: 'string', format: 'date-time' },
            notes:    { type: 'string', nullable: true },
          },
        },
        AuditLog: {
          type: 'object',
          properties: {
            id:         { type: 'string' },
            action:     { type: 'string', enum: ['CREATE', 'UPDATE', 'DELETE'] },
            actorEmail: { type: 'string' },
            diff:       { type: 'object', nullable: true },
            createdAt:  { type: 'string', format: 'date-time' },
          },
        },
        Error: {
          type: 'object',
          properties: {
            success:   { type: 'boolean', example: false },
            message:   { type: 'string' },
            requestId: { type: 'string' },
          },
        },
      },
    },
    security: [{ bearerAuth: [] }],
    tags: [
      { name: 'Auth',      description: 'Register, login, profile' },
      { name: 'Users',     description: 'User management (ADMIN only)' },
      { name: 'Records',   description: 'Financial records CRUD' },
      { name: 'Dashboard', description: 'Analytics and summaries (ANALYST+)' },
      { name: 'Audit',     description: 'Immutable audit trail (ADMIN only)' },
    ],
    paths: {
      // ── AUTH ──────────────────────────────────────────────────────────────
      '/auth/register': {
        post: {
          tags: ['Auth'], summary: 'Register a new user', security: [],
          requestBody: {
            required: true,
            content: { 'application/json': { schema: { type: 'object', required: ['name','email','password'],
              properties: {
                name:     { type: 'string', example: 'Jane Doe' },
                email:    { type: 'string', example: 'jane@example.com' },
                password: { type: 'string', example: 'secret123' },
                role:     { type: 'string', enum: ['VIEWER','ANALYST','ADMIN'], example: 'ANALYST' },
              },
            }}},
          },
          responses: {
            201: { description: 'User created', content: { 'application/json': { schema: { properties: { success: { type: 'boolean' }, data: { $ref: '#/components/schemas/User' } } } } } },
            409: { description: 'Email already exists', content: { 'application/json': { schema: { $ref: '#/components/schemas/Error' } } } },
            422: { description: 'Validation error' },
          },
        },
      },
      '/auth/login': {
        post: {
          tags: ['Auth'], summary: 'Login and get JWT token', security: [],
          requestBody: {
            required: true,
            content: { 'application/json': { schema: { type: 'object', required: ['email','password'],
              properties: {
                email:    { type: 'string', example: 'admin@finance.com' },
                password: { type: 'string', example: 'password123' },
              },
            }}},
          },
          responses: {
            200: { description: 'Login successful — copy the token and click Authorize above', content: { 'application/json': { schema: { properties: { success: { type: 'boolean' }, data: { properties: { token: { type: 'string' }, user: { $ref: '#/components/schemas/User' } } } } } } } },
            401: { description: 'Invalid credentials' },
          },
        },
      },
      '/auth/me': {
        get: {
          tags: ['Auth'], summary: 'Get your own profile',
          responses: {
            200: { description: 'Current user', content: { 'application/json': { schema: { properties: { success: { type: 'boolean' }, data: { $ref: '#/components/schemas/User' } } } } } },
            401: { description: 'Unauthorized' },
          },
        },
      },

      // ── USERS ─────────────────────────────────────────────────────────────
      '/users': {
        get: {
          tags: ['Users'], summary: 'List all users (ADMIN)',
          responses: { 200: { description: 'User list' }, 403: { description: 'Forbidden' } },
        },
      },
      '/users/{id}': {
        get: {
          tags: ['Users'], summary: 'Get a user by ID (ADMIN)',
          parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string' } }],
          responses: { 200: { description: 'User found' }, 404: { description: 'Not found' } },
        },
        patch: {
          tags: ['Users'], summary: 'Update user role or status (ADMIN)',
          parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string' } }],
          requestBody: { content: { 'application/json': { schema: { type: 'object', properties: {
            name:     { type: 'string' },
            role:     { type: 'string', enum: ['VIEWER','ANALYST','ADMIN'] },
            isActive: { type: 'boolean' },
          }}}}},
          responses: { 200: { description: 'Updated' }, 403: { description: 'Forbidden' } },
        },
        delete: {
          tags: ['Users'], summary: 'Deactivate a user — soft delete (ADMIN)',
          parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string' } }],
          responses: { 200: { description: 'Deactivated' }, 403: { description: 'Forbidden' } },
        },
      },

      // ── RECORDS ───────────────────────────────────────────────────────────
      '/records': {
        get: {
          tags: ['Records'], summary: 'List records — VIEWERs see own only, ANALYST/ADMIN see all',
          parameters: [
            { name: 'type',     in: 'query', schema: { type: 'string', enum: ['INCOME','EXPENSE'] } },
            { name: 'category', in: 'query', schema: { type: 'string' }, description: 'Partial match' },
            { name: 'dateFrom', in: 'query', schema: { type: 'string', format: 'date' }, example: '2026-01-01' },
            { name: 'dateTo',   in: 'query', schema: { type: 'string', format: 'date' }, example: '2026-03-31' },
            { name: 'page',     in: 'query', schema: { type: 'integer', default: 1 } },
            { name: 'limit',    in: 'query', schema: { type: 'integer', default: 20 } },
          ],
          responses: { 200: { description: 'Paginated records' }, 401: { description: 'Unauthorized' } },
        },
        post: {
          tags: ['Records'], summary: 'Create a record (ADMIN only)',
          requestBody: { required: true, content: { 'application/json': { schema: { type: 'object', required: ['amount','type','category','date'],
            properties: {
              amount:   { type: 'number', example: 5000 },
              type:     { type: 'string', enum: ['INCOME','EXPENSE'], example: 'INCOME' },
              category: { type: 'string', example: 'Salary' },
              date:     { type: 'string', format: 'date', example: '2026-04-01' },
              notes:    { type: 'string', example: 'April salary' },
            },
          }}}},
          responses: { 201: { description: 'Created' }, 403: { description: 'Forbidden' }, 422: { description: 'Validation error' } },
        },
      },
      '/records/{id}': {
        get: {
          tags: ['Records'], summary: 'Get a single record',
          parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string' } }],
          responses: { 200: { description: 'Record found' }, 404: { description: 'Not found' } },
        },
        patch: {
          tags: ['Records'], summary: 'Update a record (ADMIN only)',
          parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string' } }],
          requestBody: { content: { 'application/json': { schema: { type: 'object', properties: {
            amount:   { type: 'number' },
            type:     { type: 'string', enum: ['INCOME','EXPENSE'] },
            category: { type: 'string' },
            date:     { type: 'string', format: 'date' },
            notes:    { type: 'string' },
          }}}}},
          responses: { 200: { description: 'Updated' }, 403: { description: 'Forbidden' } },
        },
        delete: {
          tags: ['Records'], summary: 'Soft-delete a record (ADMIN only)',
          parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string' } }],
          responses: { 200: { description: 'Deleted' }, 403: { description: 'Forbidden' } },
        },
      },

      // ── DASHBOARD ─────────────────────────────────────────────────────────
      '/dashboard/summary': {
        get: {
          tags: ['Dashboard'], summary: 'Total income, expenses, net balance (ANALYST+)',
          parameters: [
            { name: 'from', in: 'query', schema: { type: 'string', format: 'date' }, example: '2026-01-01' },
            { name: 'to',   in: 'query', schema: { type: 'string', format: 'date' }, example: '2026-03-31' },
          ],
          responses: { 200: { description: 'Summary totals' }, 403: { description: 'Forbidden' } },
        },
      },
      '/dashboard/categories': {
        get: {
          tags: ['Dashboard'], summary: 'Totals grouped by category and type (ANALYST+)',
          responses: { 200: { description: 'Category breakdown' } },
        },
      },
      '/dashboard/trends/monthly': {
        get: {
          tags: ['Dashboard'], summary: 'Monthly income/expense trends (ANALYST+)',
          parameters: [{ name: 'months', in: 'query', schema: { type: 'integer', default: 6 }, description: 'How many months back (max 24)' }],
          responses: { 200: { description: 'Monthly buckets' } },
        },
      },
      '/dashboard/trends/weekly': {
        get: {
          tags: ['Dashboard'], summary: 'Weekly income/expense trends (ANALYST+)',
          parameters: [{ name: 'weeks', in: 'query', schema: { type: 'integer', default: 8 }, description: 'How many weeks back (max 52)' }],
          responses: { 200: { description: 'Weekly buckets' } },
        },
      },
      '/dashboard/recent': {
        get: {
          tags: ['Dashboard'], summary: 'Most recent financial activity (ANALYST+)',
          parameters: [{ name: 'limit', in: 'query', schema: { type: 'integer', default: 10 }, description: 'Max 50' }],
          responses: { 200: { description: 'Recent records' } },
        },
      },

      // ── AUDIT ─────────────────────────────────────────────────────────────
      '/audit': {
        get: {
          tags: ['Audit'], summary: 'Recent mutations across all records (ADMIN)',
          parameters: [{ name: 'limit', in: 'query', schema: { type: 'integer', default: 20 } }],
          responses: { 200: { description: 'Audit entries' }, 403: { description: 'Forbidden' } },
        },
      },
      '/audit/records/{id}': {
        get: {
          tags: ['Audit'], summary: 'Full audit history for a specific record (ADMIN)',
          parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string' } }],
          responses: { 200: { description: 'Audit history' }, 403: { description: 'Forbidden' } },
        },
      },
    },
  },
  apis: [],
};

module.exports = swaggerJsdoc(options);
