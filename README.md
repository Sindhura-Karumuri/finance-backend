# Finance Data Processing and Access Control Backend

A role-based REST API for managing financial records and serving dashboard analytics.

---

## Tech Stack

- Node.js + Express
- MongoDB via Prisma ORM
- JWT (Bearer tokens)
- express-validator

---

## What makes this different

Most submissions implement basic CRUD + role middleware. This one goes further:

1. **Audit Trail** — every CREATE, UPDATE, DELETE on a financial record is logged immutably with the actor's identity and a field-level diff (before/after). Queryable via `/api/audit`.
2. **VIEWER scoping** — VIEWERs don't see all records. They only see records they created. ANALYST and ADMIN see everything. This reflects real finance system access patterns.
3. **Weekly trends** — `/api/dashboard/trends/weekly` groups data by ISO week, not just monthly.
4. **Date-range summary** — `/api/dashboard/summary?from=&to=` lets you scope totals to any period instead of always returning all-time figures.
5. **Request ID tracing** — every request and response carries an `X-Request-Id` header. Errors include the ID in the response body for easy log correlation.

---

## Assumptions

- Roles follow a strict hierarchy: `VIEWER < ANALYST < ADMIN`. Higher roles inherit lower-role access.
- Financial records are soft-deleted (`isDeleted: true`) — never permanently removed, which matters for audit integrity.
- VIEWERs can only read records they personally created. They cannot access dashboard analytics.
- ANALYSTs can read all records and access all dashboard endpoints but cannot mutate data.
- Only ADMINs can create, update, delete records and manage users.
- Self-registration is open to all roles for assessment simplicity. In production, ADMIN creation would be restricted to an internal flow.

---

## Setup

```bash
# 1. Install
npm install

# 2. Configure
cp .env.example .env
# Fill in your MongoDB connection string and JWT secret
# Get a free MongoDB Atlas cluster at https://cloud.mongodb.com

# 3. Push schema to MongoDB
npm run db:push

# 4. Seed
npm run db:seed

# 5. Run
npm run dev
```

Seed creates three users (password: `password123`):

| Email                 | Role    |
|-----------------------|---------|
| admin@finance.com     | ADMIN   |
| analyst@finance.com   | ANALYST |
| viewer@finance.com    | VIEWER  |

---

## API Reference

### Auth

| Method | Path               | Access | Description      |
|--------|--------------------|--------|------------------|
| POST   | /api/auth/register | Public | Register a user  |
| POST   | /api/auth/login    | Public | Login, get token |
| GET    | /api/auth/me       | Any    | Get own profile  |

---

### Users (ADMIN only)

| Method | Path           | Description                   |
|--------|----------------|-------------------------------|
| GET    | /api/users     | List all users                |
| GET    | /api/users/:id | Get a user                    |
| PATCH  | /api/users/:id | Update name, role, or status  |
| DELETE | /api/users/:id | Deactivate user (soft delete) |

---

### Financial Records

| Method | Path             | Access  | Description                          |
|--------|------------------|---------|--------------------------------------|
| GET    | /api/records     | VIEWER+ | List records (filtered, paginated)   |
| GET    | /api/records/:id | VIEWER+ | Get a single record                  |
| POST   | /api/records     | ADMIN   | Create a record                      |
| PATCH  | /api/records/:id | ADMIN   | Update a record                      |
| DELETE | /api/records/:id | ADMIN   | Soft-delete a record                 |

Query filters for `GET /api/records`:
- `type` — `INCOME` or `EXPENSE`
- `category` — partial match, case-insensitive
- `dateFrom` / `dateTo` — ISO 8601
- `page` / `limit` — pagination (default: page 1, limit 20)

> VIEWERs automatically see only records they created. No extra parameter needed.

---

### Dashboard (ANALYST+)

| Method | Path                          | Description                              |
|--------|-------------------------------|------------------------------------------|
| GET    | /api/dashboard/summary        | Totals + net balance (supports `?from=&to=`) |
| GET    | /api/dashboard/categories     | Totals grouped by category and type      |
| GET    | /api/dashboard/trends/monthly | Monthly trends (`?months=6`)             |
| GET    | /api/dashboard/trends/weekly  | Weekly trends (`?weeks=8`)               |
| GET    | /api/dashboard/recent         | Recent activity (`?limit=10`)            |

---

### Audit Log (ADMIN only)

| Method | Path                    | Description                          |
|--------|-------------------------|--------------------------------------|
| GET    | /api/audit              | Recent mutations across all records  |
| GET    | /api/audit/records/:id  | Full history for a specific record   |

Each audit entry includes: `action` (CREATE/UPDATE/DELETE), `actorEmail`, `diff` (before/after for updates), and `createdAt`.

---

## Access Control Summary

| Endpoint group     | VIEWER | ANALYST | ADMIN |
|--------------------|--------|---------|-------|
| Auth               | ✓      | ✓       | ✓     |
| Read records       | own    | all     | all   |
| Create/Edit/Delete | ✗      | ✗       | ✓     |
| Dashboard          | ✗      | ✓       | ✓     |
| User management    | ✗      | ✗       | ✓     |
| Audit logs         | ✗      | ✗       | ✓     |

---

## Error Responses

```json
{ "success": false, "message": "...", "requestId": "uuid" }
```

| Status | Meaning                       |
|--------|-------------------------------|
| 401    | Missing or invalid token      |
| 403    | Insufficient role permissions |
| 404    | Resource not found            |
| 409    | Conflict (duplicate email)    |
| 422    | Validation failed             |
| 500    | Internal server error         |
