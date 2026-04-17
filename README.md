# Employee Management API

A RESTful backend service for managing employee records, built with Node.js, Express, TypeScript, and PostgreSQL. Features JWT authentication with role-based access, Swagger docs, Docker support, and a Jest test suite.

## Table of Contents

- [Tech Stack](#tech-stack)
- [Features](#features)
- [Project Structure](#project-structure)
- [Prerequisites](#prerequisites)
- [Setup](#setup)
  - [Run with Docker (recommended)](#run-with-docker-recommended)
  - [Run natively](#run-natively)
- [Environment Variables](#environment-variables)
- [Database](#database)
- [API Documentation](#api-documentation)
  - [Auth Endpoints](#auth-endpoints)
  - [Employee Endpoints](#employee-endpoints)
  - [Response Format](#response-format)
  - [Error Codes](#error-codes)
- [Postman Collection](#postman-collection)
- [Tests](#tests)
- [Assumptions](#assumptions)

---

## Tech Stack

- **Runtime**: Node.js 24 (TypeScript, CommonJS)
- **Framework**: Express 5
- **Database**: PostgreSQL 18 (`pg` driver)
- **Auth**: `jsonwebtoken` + `bcryptjs`
- **Docs**: `swagger-jsdoc` + `swagger-ui-express`
- **Testing**: Jest + ts-jest + supertest
- **Container**: Docker + Docker Compose

## Features

- Full CRUD for employees with pagination and name search
- JWT authentication with `admin` / `employee` roles
- Role-based authorization (admins write, employees read)
- Soft delete with email uniqueness preserved only among active records
- Centralized error handling with proper HTTP status codes
- Auto-creates the database and applies schema on first boot
- Interactive API docs at `/api/docs`
- 47 tests across auth, employee CRUD, and middleware

## Project Structure

```
src/
├── app.ts                    # Express app (no server startup, imported by tests)
├── index.ts                  # Startup: env validation, DB connect, server listen
├── database.sql              # Schema (users + employees, applied on boot)
├── config/
│   ├── db.ts                 # pg Pool, auto-create DB, apply schema
│   └── swagger.ts            # OpenAPI spec + Swagger UI config
├── controllers/              # Request handlers (auth, employee)
├── middleware/               # authenticate, authorize, errorHandler, notFound
├── models/                   # SQL queries (parameterized)
├── routes/                   # Route definitions with middleware wiring
├── types/                    # Shared TypeScript types
├── utils/                    # AppError class
└── __tests__/                # Jest test suites
```

## Prerequisites

- **Docker**
- **Or natively**: Node.js 22+ (tested on 24) and PostgreSQL 16+ (tested on 18)

## Setup

### Run with Docker (recommended)

1. Copy environment template and fill in secrets:
   ```bash
   cp .env.example .env
   # Edit .env and set DB_PASSWORD + JWT_SECRET to real values
   ```

2. Start the stack:
   ```bash
   docker compose up --build
   ```

The API is now on `http://localhost:3000`, Swagger docs on `http://localhost:3000/api/docs`.

Stop: `Ctrl+C` (or `docker compose down`). Wipe data: `docker compose down -v`.

### Run natively

1. Start a local PostgreSQL instance (any recent version).
2. Copy and fill in env vars:
   ```bash
   cp .env.example .env
   ```
3. Install and run:
   ```bash
   npm install
   npm run dev      # nodemon and ts-node (for typescript), hot reload
   ```

On first boot the app connects to the default `postgres` database, creates the target database if missing, then applies `src/database.sql`. No manual DB setup needed.

Build for production:
```bash
npm run build    # tsc + copies database.sql into dist/
npm start        # node dist/index.js
```

## Environment Variables

| Variable | Example | Notes |
|---|---|---|
| `PORT` | `3000` | HTTP port the API listens on |
| `DB_HOST` | `localhost` | Docker Compose overrides to `db` at runtime |
| `DB_PORT` | `5432` | Postgres port |
| `DB_NAME` | `employee_management` | Created on first boot if missing |
| `DB_USER` | `postgres` | Needs `CREATEDB` privilege for auto-create |
| `DB_PASSWORD` | `your_password` | ... |
| `JWT_SECRET` | `your_jwt_secret_key` | Required; server refuses to start without it |
| `JWT_EXPIRES_IN` | `7d` | Token lifetime (e.g., `1h`, `7d`) |

Missing required vars cause the server to log the missing names and exit.

## Database

Schema lives in [`src/database.sql`](src/database.sql) and is applied automatically on startup.

**`users`**: authentication accounts
- `id` SERIAL PK
- `email` VARCHAR(100) UNIQUE NOT NULL
- `password_hash` VARCHAR(255) NOT NULL (bcrypt, cost 12)
- `role` VARCHAR(20) NOT NULL DEFAULT `'employee'` (`admin` or `employee`)
- `created_at` TIMESTAMP DEFAULT NOW()

**`employees`**: employee records
- `id` SERIAL PK
- `full_name` VARCHAR(100) NOT NULL
- `email` VARCHAR(100) NOT NULL
- `phone` VARCHAR(20) NOT NULL
- `department` VARCHAR(50) NOT NULL
- `salary` DECIMAL(10, 2) NOT NULL
- `created_at` TIMESTAMP DEFAULT NOW()
- `deleted_at` TIMESTAMP DEFAULT NULL (soft delete marker)

A partial unique index on `(email) WHERE deleted_at IS NULL` enforces email uniqueness only among active rows, so soft-deleted employees' emails can be reused.

## API Documentation

Interactive Swagger UI: **`http://localhost:3000/api/docs`** (includes request schemas, examples, and a "Try it out" button).

Base URL: `http://localhost:3000/api`

### Auth Endpoints

| Method | Path | Description | Auth |
|---|---|---|---|
| POST | `/auth/register` | Create a user account; returns JWT | public |
| POST | `/auth/login` | Exchange credentials for JWT | public |

**Register**: `POST /api/auth/register`
```json
{
  "email": "admin@example.com",
  "password": "secret123",
  "role": "admin"
}
```
Rules: `password` ≥ 6 chars; `role` is `admin` or `employee` (default `employee`).

**Login**: `POST /api/auth/login`
```json
{ "email": "admin@example.com", "password": "secret123" }
```

Both return:
```json
{
  "status": "success",
  "token": "<jwt>",
  "data": { "user": { "id": 1, "email": "admin@example.com", "role": "admin" } }
}
```

Use the token on protected routes: `Authorization: Bearer <jwt>`.

### Employee Endpoints

All employee endpoints require a valid JWT. Write operations (POST/PUT/DELETE) require `admin` role.

| Method | Path | Description | Role |
|---|---|---|---|
| POST | `/employees` | Create employee | admin |
| GET | `/employees` | List employees (paginated, searchable) | admin, employee |
| GET | `/employees/:id` | Get one employee | admin, employee |
| PUT | `/employees/:id` | Update employee | admin |
| DELETE | `/employees/:id` | Soft delete employee | admin |

**Create**: `POST /api/employees`
```json
{
  "full_name": "Jane Doe",
  "email": "jane@example.com",
  "phone": "+1234567890",
  "department": "Engineering",
  "salary": 75000
}
```
All fields required. Duplicate email against an active employee returns `409`.

**List**: `GET /api/employees?page=1&limit=10&search=jane`

Query params:
- `page` (default `1`, min `1`)
- `limit` (default `10`, max `100`)
- `search` (case-insensitive match on `full_name`)

Response:
```json
{
  "status": "success",
  "results": 1,
  "total": 1,
  "page": 1,
  "limit": 10,
  "data": { "employees": [ /* ... */ ] }
}
```

**Get by ID**: `GET /api/employees/:id` -> returns `404` if missing or soft-deleted.

**Update**: `PUT /api/employees/:id` -> partial update, at least one field required. Validates email/salary if present.

**Delete**: `DELETE /api/employees/:id` -> soft delete (sets `deleted_at`).

### Response Format

Success:
```json
{ "status": "success", "data": { /* ... */ } }
```

Error:
```json
{ "status": "error", "message": "Human-readable message" }
```

### Error Codes

| Code | When |
|---|---|
| `400` | Validation failure (missing fields, bad email, non-positive salary, invalid ID) |
| `401` | Missing/invalid JWT |
| `403` | Authenticated but wrong role |
| `404` | Record not found |
| `409` | Duplicate email |
| `500` | Unhandled server error |

## Postman Collection

A ready-to-use Postman collection is in [`postman/employee-management-api.postman_collection.json`](postman/employee-management-api.postman_collection.json).

- `{{baseUrl}}` defaults to `http://localhost:3000`; change in collection variables if your port differs.
- The Register and Login requests auto-save the returned JWT to `{{token}}`, so every subsequent employee request is authenticated without copy-pasting.

## Tests

47 tests across 3 files, models and the DB pool are mocked, so no real database is required.

- `src/__tests__/auth.test.ts`: register + login flows
- `src/__tests__/employee.test.ts`: full CRUD, role checks, pagination shape
- `src/__tests__/middleware.test.ts`: authenticate, authorize, errorHandler, notFound

**Natively:**
```bash
npm test                  # run full suite
npm run test:coverage     # with coverage report
```

**In Docker:**
```bash
docker compose run --rm test                          # run full suite
docker compose run --rm test npm run test:coverage    # with coverage report
```

The `test` service uses the `builder` stage of the Dockerfile (which has dev dependencies) and mounts `src/__tests__` and `jest.config.js` at runtime. It's behind a Compose profile, so it never starts with `docker compose up`, only when invoked explicitly via `run`.

## Notes

- **Auto-created database.** On first boot the API connects to the default `postgres` database and creates the target DB if missing. The configured user needs the `CREATEDB` privilege. The official `postgres` Docker image superuser has this by default.
- **Soft delete is the default.** `DELETE /api/employees/:id` sets `deleted_at`; rows are never hard-deleted by the API. All read/update queries filter `deleted_at IS NULL`.
- **Email uniqueness is scoped to active rows** via a partial unique index, so deleting an employee frees their email for reuse.
- **Salary is stored as `DECIMAL(10, 2)`** but validated as a positive number on input. No currency or rounding logic, trailing precision is the caller's responsibility.
- **Roles are fixed at `admin` and `employee`.** No role management endpoints; promote/demote requires a direct DB update.
- **Default role on registration is `employee`.** Anyone can self-register as an admin today, in a real deployment you'd lock the admin role behind an invite flow or manual promotion. Kept open here for grading convenience.
- **JWT is stateless.** No refresh tokens, no logout endpoint, invalidate by letting the token expire or rotating `JWT_SECRET`.
- **Pagination caps at `limit=100`** to avoid unbounded result sets.
- **Search matches on `full_name` only**, case-insensitive substring. No filtering by department or salary range (not required by spec).
- **`src/database.sql` is the source of truth for schema.** Applied on every boot via `CREATE TABLE IF NOT EXISTS`, so it's safe to rerun. Schema changes that alter existing columns would need a separate migration strategy.
