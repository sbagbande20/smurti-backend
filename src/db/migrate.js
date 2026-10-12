import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { createPool } from './pool.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const migrationsDir = path.resolve(__dirname, '../../migrations');

async function ensureMigrationTable(connection) {
  await connection.query(`
    CREATE TABLE IF NOT EXISTS schema_migrations (
      id VARCHAR(255) PRIMARY KEY,
      applied_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
  `);
}

async function listMigrationFiles() {
  const entries = await fs.readdir(migrationsDir);
  return entries.filter((entry) => entry.endsWith('.sql')).sort();
}

export async function runMigrations(pool = createPool()) {
  const connection = await pool.getConnection();

  try {
    await ensureMigrationTable(connection);
    const [appliedRows] = await connection.query('SELECT id FROM schema_migrations');
    const applied = new Set(appliedRows.map((row) => row.id));
    const files = await listMigrationFiles();
    const executed = [];

    for (const file of files) {
      if (applied.has(file)) {
        continue;
      }

      const sql = await fs.readFile(path.join(migrationsDir, file), 'utf8');
      await connection.beginTransaction();
      try {
        for (const statement of sql.split(/;\s*$/m).map((part) => part.trim()).filter(Boolean)) {
          await connection.query(statement);
        }
        await connection.query('INSERT INTO schema_migrations (id) VALUES (?)', [file]);
        await connection.commit();
        executed.push(file);
      } catch (error) {
        await connection.rollback();
        throw error;
      }
    }

    return executed;
  } finally {
    connection.release();
  }
}

const isCli = process.argv[1] && path.resolve(process.argv[1]) === __filename;

if (isCli) {
  const pool = createPool({ multipleStatements: false });
  runMigrations(pool)
    .then((executed) => {
      console.info(
        executed.length === 0
          ? 'No pending migrations.'
          : `Applied migrations: ${executed.join(', ')}`
      );
      return pool.end();
    })
    .catch(async (error) => {
      console.error('Migration failed:', error.message);
      await pool.end();
      process.exit(1);
    });
}
