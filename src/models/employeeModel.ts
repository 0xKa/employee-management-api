import pool from '../config/db';
import {
  Employee,
  CreateEmployeeInput,
  UpdateEmployeeInput,
  EmployeeQueryParams,
} from '../types/employee';

export const createEmployee = async (data: CreateEmployeeInput): Promise<Employee> => {
  const { full_name, email, phone, department, salary } = data;
  const result = await pool.query<Employee>(
    `INSERT INTO employees (full_name, email, phone, department, salary)
     VALUES ($1, $2, $3, $4, $5)
     RETURNING *`,
    [full_name, email, phone, department, salary]
  );
  return result.rows[0];
};

export const getAllEmployees = async (
  params: EmployeeQueryParams
): Promise<{ rows: Employee[]; total: number }> => {
  const page = Math.max(1, parseInt(params.page || '1', 10) || 1);
  const limit = Math.max(1, Math.min(100, parseInt(params.limit || '10', 10) || 10));
  const offset = (page - 1) * limit;

  const queryValues: unknown[] = [];
  let whereClause = 'WHERE deleted_at IS NULL';

  if (params.search) {
    queryValues.push(`%${params.search}%`);
    whereClause += ` AND full_name ILIKE $${queryValues.length}`;
  }

  const countResult = await pool.query<{ count: string }>(
    `SELECT COUNT(*) FROM employees ${whereClause}`,
    queryValues
  );

  queryValues.push(limit, offset);
  const dataResult = await pool.query<Employee>(
    `SELECT * FROM employees ${whereClause}
     ORDER BY created_at DESC
     LIMIT $${queryValues.length - 1} OFFSET $${queryValues.length}`,
    queryValues
  );

  return {
    rows: dataResult.rows,
    total: parseInt(countResult.rows[0].count, 10),
  };
};

export const getEmployeeById = async (id: number): Promise<Employee | null> => {
  const result = await pool.query<Employee>(
    'SELECT * FROM employees WHERE id = $1 AND deleted_at IS NULL',
    [id]
  );
  return result.rows[0] ?? null;
};

export const updateEmployee = async (
  id: number,
  data: UpdateEmployeeInput
): Promise<Employee | null> => {
  const keys = Object.keys(data) as (keyof UpdateEmployeeInput)[];
  const setClause = keys.map((key, i) => `${key} = $${i + 1}`).join(', ');
  const values: unknown[] = [...keys.map((key) => data[key]), id];

  const result = await pool.query<Employee>(
    `UPDATE employees
     SET ${setClause}
     WHERE id = $${keys.length + 1} AND deleted_at IS NULL
     RETURNING *`,
    values
  );
  return result.rows[0] ?? null;
};

export const softDeleteEmployee = async (id: number): Promise<boolean> => {
  const result = await pool.query(
    'UPDATE employees SET deleted_at = NOW() WHERE id = $1 AND deleted_at IS NULL',
    [id]
  );
  return (result.rowCount ?? 0) > 0;
};
