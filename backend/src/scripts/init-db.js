/**
 * init-db.js
 * Reads ../../schema.sql and executes it against the configured PostgreSQL
 * database to create all tables, types, indexes, and triggers.
 *
 * Usage: npm run init-db
 *
 * Safe to re-run: skips schema apply when the core schema already exists,
 * unless you pass --fresh.
 */

import 'dotenv/config';
import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, resolve } from 'path';
import pg from 'pg';

const { Client } = pg;

const __dirname = dirname(fileURLToPath(import.meta.url));
const SCHEMA_PATH = resolve(__dirname, '../../schema.sql');
const FRESH = process.argv.includes('--fresh');

async function main() {
  const client = new Client(
    process.env.DATABASE_URL
      ? {
          connectionString: process.env.DATABASE_URL,
          ssl:
            process.env.DATABASE_URL.includes('railway') ||
            process.env.DATABASE_URL.includes('neon') ||
            process.env.NODE_ENV === 'production'
              ? { rejectUnauthorized: false }
              : false,
        }
      : {
          host: process.env.DB_HOST || 'localhost',
          port: Number(process.env.DB_PORT) || 5432,
          database: process.env.DB_NAME || 'sfc_db',
          user: process.env.DB_USER || 'postgres',
          password: process.env.DB_PASSWORD || '',
        }
  );

  await client.connect();
  console.log('Connected to PostgreSQL');

  try {
    if (FRESH) {
      console.warn('--fresh flag detected: dropping all custom types and tables...');
      await dropAll(client);
    }

    const schemaExists = await client.query(`
      SELECT EXISTS (
        SELECT 1
        FROM information_schema.tables
        WHERE table_schema = 'public' AND table_name = 'users'
      ) AS exists
    `);

    if (schemaExists.rows[0].exists && !FRESH) {
      console.log('Existing schema detected - skipping schema apply');
      await ensureUserColumns(client);
    } else {
      const sql = readFileSync(SCHEMA_PATH, 'utf8');
      await client.query(sql);
      console.log('Schema applied successfully');
    }

    await seedAdmin(client);
  } catch (err) {
    console.error('Schema init failed:', err.message);
    process.exit(1);
  } finally {
    await client.end();
  }
}

async function dropAll(client) {
  await client.query(`
    DROP TABLE IF EXISTS
      notifications, email_invites, co_attainment_results,
      answer_selected_options, answer_grid_values, answers,
      responses, question_options, question_rows, questions,
      forms, dimension_co_map, course_outcomes, subject_faculty,
      subjects, student_academic_status, student_profiles, branches, programmes, courses, users
    CASCADE;

    DROP TYPE IF EXISTS
      attainment_level, teaching_dimension, question_type,
      form_status, form_mode, user_role
    CASCADE;

    DROP FUNCTION IF EXISTS set_updated_at CASCADE;
  `);
  console.log('Existing schema dropped');
}

async function seedAdmin(client) {
  const email = process.env.ADMIN_EMAIL;
  const password = process.env.ADMIN_PASSWORD;

  if (!email || !password) {
    console.warn('ADMIN_EMAIL / ADMIN_PASSWORD not set - skipping admin seed');
    return;
  }

  const usersTableExists = await client.query(`
    SELECT EXISTS (
      SELECT 1
      FROM information_schema.tables
      WHERE table_schema = 'public' AND table_name = 'users'
    ) AS exists
  `);

  if (!usersTableExists.rows[0].exists) {
    console.warn('Users table not present - skipping admin seed');
    return;
  }

  const existing = await client.query(
    'SELECT id FROM users WHERE email = $1',
    [email]
  );
  if (existing.rowCount > 0) {
    console.log('Admin account already exists - skipping seed');
    return;
  }

  const bcrypt = await import('bcrypt');
  const hash = await bcrypt.default.hash(password, 12);

  await client.query(
    `INSERT INTO users (name, email, password_hash, role, must_change_password)
     VALUES ($1, $2, $3, 'admin', false)`,
    ['Administrator', email, hash]
  );
  console.log(`Admin account seeded: ${email}`);
}

async function ensureUserColumns(client) {
  await client.query(`
    ALTER TABLE users
      ADD COLUMN IF NOT EXISTS designation VARCHAR(150),
      ADD COLUMN IF NOT EXISTS phone VARCHAR(20)
  `);
  console.log('Ensured optional faculty profile columns on users');
}

main();
