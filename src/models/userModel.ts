import pool from '../config/db';
import { User } from '../types/auth';

export const createUser = async (
  email: string,
  passwordHash: string,
  role: 'admin' | 'employee'
): Promise<User> => {
  const result = await pool.query<User>(
    `INSERT INTO users (email, password_hash, role) VALUES ($1, $2, $3) RETURNING *`,
    [email, passwordHash, role]
  );
  return result.rows[0];
};

export const getUserByEmail = async (email: string): Promise<User | null> => {
  const result = await pool.query<User>(
    'SELECT * FROM users WHERE email = $1',
    [email]
  );
  return result.rows[0] ?? null;
};
