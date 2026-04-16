-- Employee Management API

CREATE TABLE IF NOT EXISTS employees (
  id          SERIAL PRIMARY KEY,
  full_name   VARCHAR(100)   NOT NULL,
  email       VARCHAR(100)   UNIQUE NOT NULL,
  phone       VARCHAR(20)    NOT NULL,
  department  VARCHAR(50)    NOT NULL,
  salary      DECIMAL(10, 2) NOT NULL,
  created_at  TIMESTAMP      DEFAULT NOW(),
  deleted_at  TIMESTAMP      DEFAULT NULL 
);
