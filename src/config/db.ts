import { Pool } from 'pg';
import dotenv from 'dotenv';
import fs from 'fs';
import path from 'path';

dotenv.config();

const pool = new Pool({
  host: process.env.DB_HOST,
  port: Number(process.env.DB_PORT),
  database: process.env.DB_NAME,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
});

// Connects to the default 'postgres' db to create our target db if it doesn't exist
const ensureDatabase = async (): Promise<void> => {
  const adminPool = new Pool({
    host: process.env.DB_HOST,
    port: Number(process.env.DB_PORT),
    database: 'postgres',
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
  });

  try {
    const result = await adminPool.query(
      'SELECT 1 FROM pg_database WHERE datname = $1',
      [process.env.DB_NAME]
    );
    if ((result.rowCount ?? 0) === 0) {
      await adminPool.query(`CREATE DATABASE "${process.env.DB_NAME}"`);
      console.log(`Database "${process.env.DB_NAME}" created`);
    }
  } finally {
    await adminPool.end();
  }
};

export const connectDB = async (): Promise<void> => {
  try {
    await ensureDatabase();

    const schema = fs.readFileSync(
      path.resolve(__dirname, '../database.sql'),
      'utf8'
    );
    await pool.query(schema);

    console.log('Database connected and schema applied');
  } catch (error) {
    console.error('Database connection failed:', error);
    process.exit(1);
  }
};

export default pool;
