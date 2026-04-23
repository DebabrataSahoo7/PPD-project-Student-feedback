/**
 * ONE-TIME SETUP ROUTE
 * POST /api/v1/setup
 *
 * Runs schema + admin seed against the live database.
 * Protected by SETUP_SECRET env var.
 * Safe to call multiple times — skips if schema already exists.
 *
 * DELETE THIS FILE after first successful setup.
 */

import { Router } from 'express';
import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, resolve } from 'path';
import pg from 'pg';
import bcrypt from 'bcrypt';

const { Client } = pg;
const router = Router();
const __dirname = dirname(fileURLToPath(import.meta.url));
const SCHEMA_PATH = resolve(__dirname, '../../schema.sql');

router.post('/', async (req, res) => {
  const secret = req.headers['x-setup-secret'];
  if (!secret || secret !== process.env.SETUP_SECRET) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  const client = new Client({
    connectionString: process.env.DATABASE_URL,
    ssl: { rejectUnauthorized: false },
  });

  const log = [];

  try {
    await client.connect();
    log.push('Connected to database');

    // Check if schema already exists
    const { rows } = await client.query(`
      SELECT EXISTS (
        SELECT 1 FROM information_schema.tables
        WHERE table_schema = 'public' AND table_name = 'users'
      ) AS exists
    `);

    if (!rows[0].exists) {
      const sql = readFileSync(SCHEMA_PATH, 'utf8');
      await client.query(sql);
      log.push('Schema applied successfully');
    } else {
      // Ensure optional columns exist
      await client.query(`
        ALTER TABLE users
          ADD COLUMN IF NOT EXISTS designation VARCHAR(150),
          ADD COLUMN IF NOT EXISTS phone VARCHAR(20)
      `);
      log.push('Schema already exists — skipped');
    }

    // Seed admin
    const email    = process.env.ADMIN_EMAIL;
    const password = process.env.ADMIN_PASSWORD;

    if (!email || !password) {
      log.push('ADMIN_EMAIL/ADMIN_PASSWORD not set — skipping admin seed');
    } else {
      const existing = await client.query(
        'SELECT id FROM users WHERE email = $1', [email]
      );
      if (existing.rowCount > 0) {
        log.push(`Admin already exists: ${email}`);
      } else {
        const hash = await bcrypt.hash(password, 12);
        await client.query(
          `INSERT INTO users (name, email, password_hash, role, must_change_password)
           VALUES ($1, $2, $3, 'admin', false)`,
          ['Administrator', email, hash]
        );
        log.push(`Admin seeded: ${email}`);
      }
    }

    res.json({ success: true, log });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message, log });
  } finally {
    await client.end();
  }
});

export default router;
