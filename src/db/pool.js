import mysql from 'mysql2/promise';
import { config } from '../config.js';

export function createPool(overrides = {}) {
  return mysql.createPool({
    host: config.db.host,
    port: config.db.port,
    user: config.db.user,
    password: config.db.password,
    database: config.db.database,
    waitForConnections: true,
    connectionLimit: 5,
    namedPlaceholders: true,
    charset: 'utf8mb4',
    ...overrides
  });
}

export async function checkDatabase(pool = createPool()) {
  const [rows] = await pool.query('SELECT 1 AS ok');
  return rows[0]?.ok === 1;
}
