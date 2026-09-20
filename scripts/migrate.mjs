import {neon} from '@neondatabase/serverless';
if(!process.env.DATABASE_URL)throw new Error('Set DATABASE_URL before running db:migrate');
const sql=neon(process.env.DATABASE_URL);
await sql.transaction([
  sql`CREATE TABLE IF NOT EXISTS entries(id TEXT PRIMARY KEY,fingerprint TEXT NOT NULL UNIQUE,payload TEXT NOT NULL,created_at TEXT NOT NULL)`,
  sql`CREATE TABLE IF NOT EXISTS settings(key TEXT PRIMARY KEY,value TEXT NOT NULL)`,
]);
console.log('Signal database schema is ready');
