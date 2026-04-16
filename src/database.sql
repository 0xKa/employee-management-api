-- Employee Management API

CREATE TABLE IF NOT EXISTS users (
  id            SERIAL PRIMARY KEY,
  email         VARCHAR(100) UNIQUE NOT NULL,
  password_hash VARCHAR(255) NOT NULL,
  role          VARCHAR(20)  NOT NULL DEFAULT 'employee', -- 'admin' | 'employee'
  created_at    TIMESTAMP DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS employees (
  id          SERIAL PRIMARY KEY,
  full_name   VARCHAR(100)   NOT NULL,
  email       VARCHAR(100)   NOT NULL,
  phone       VARCHAR(20)    NOT NULL,
  department  VARCHAR(50)    NOT NULL,
  salary      DECIMAL(10, 2) NOT NULL,
  created_at  TIMESTAMP      DEFAULT NOW(),
  deleted_at  TIMESTAMP      DEFAULT NULL
);

-- Enforce email uniqueness only among active (non-deleted) employees
CREATE UNIQUE INDEX IF NOT EXISTS employees_email_active_idx
  ON employees (email) WHERE deleted_at IS NULL;
