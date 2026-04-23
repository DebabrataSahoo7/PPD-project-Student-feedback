import pg from 'pg';
import 'dotenv/config';

const { Pool } = pg;

function makePool() {
  if (process.env.DATABASE_URL) {
    return new Pool({
      connectionString: process.env.DATABASE_URL,
      ssl: (process.env.DATABASE_URL.includes('railway') ||
            process.env.DATABASE_URL.includes('supabase') ||
            process.env.DATABASE_URL.includes('neon') ||
            process.env.NODE_ENV === 'production')
        ? { rejectUnauthorized: false }
        : false,
    });
  }
  return new Pool({
    host:     process.env.DB_HOST     || 'localhost',
    port:     Number(process.env.DB_PORT) || 5432,
    database: process.env.DB_NAME     || 'sfc_db',
    user:     process.env.DB_USER     || 'postgres',
    password: process.env.DB_PASSWORD || '',
  });
}

const pool = makePool();

pool.on('error', (err) => {
  console.error('Unexpected PostgreSQL pool error:', err.message);
  process.exit(1);
});

export async function query(text, params) {
  const start = Date.now();
  const res   = await pool.query(text, params);
  if (process.env.NODE_ENV !== 'production') {
    console.debug(`[SQL] ${text.slice(0, 80)} — ${Date.now() - start}ms`);
  }
  return res;
}

export async function getClient() {
  return pool.connect();
}

export default pool;
