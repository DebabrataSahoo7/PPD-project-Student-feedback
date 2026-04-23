import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import { getClient, query } from '../db/pool.js';
import { createError } from '../middleware/errorHandler.js';

const SALT_ROUNDS = 12;

function signToken(user) {
  return jwt.sign(
    { id: user.id, role: user.role, email: user.email, is_active: user.is_active },
    process.env.JWT_SECRET,
    { expiresIn: process.env.JWT_EXPIRES_IN || '7d' }
  );
}

function safeUser(user) {
  return {
    id: user.id,
    name: user.name,
    email: user.email,
    role: user.role,
    must_change_password: user.must_change_password,
  };
}

export async function register(req, res, next) {
  const client = await getClient();
  let inTransaction = false;

  try {
    const {
      name,
      email,
      password,
      role,
      registration_number = null,
      programme_id = null,
      branch_id = null,
      current_semester = null,
      section = null,
      academic_year = null,
      admission_year = null,
    } = req.body;

    const exists = await client.query('SELECT id FROM users WHERE email = $1', [email]);
    if (exists.rowCount > 0) {
      return next(createError(409, 'EMAIL_EXISTS', 'Email already registered'));
    }

    if (
      role === 'student' &&
      (!registration_number || !admission_year || !programme_id || !branch_id || !current_semester || !academic_year)
    ) {
      return next(
        createError(
          400,
          'VALIDATION_ERROR',
          'registration_number, admission_year, programme_id, branch_id, current_semester and academic_year are required for students'
        )
      );
    }

    const hash = await bcrypt.hash(password, SALT_ROUNDS);
    await client.query('BEGIN');
    inTransaction = true;

    const { rows } = await client.query(
      `INSERT INTO users (name, email, password_hash, role, must_change_password)
       VALUES ($1, $2, $3, $4, false)
       RETURNING id, name, email, role, must_change_password, is_active`,
      [name, email, hash, role]
    );

    const user = rows[0];

    if (role === 'student') {
      await client.query(
        `UPDATE users SET registration_number = $1 WHERE id = $2`,
        [registration_number, user.id]
      );
      await client.query(
        `INSERT INTO student_profiles (user_id, admission_year)
         VALUES ($1, $2)`,
        [user.id, admission_year]
      );
      await client.query(
        `INSERT INTO student_academic_status (user_id, programme_id, branch_id, current_semester, section, academic_year)
         VALUES ($1, $2, $3, $4, $5, $6)`,
        [user.id, programme_id, branch_id, current_semester, section, academic_year]
      );
      user.registration_number = registration_number;
    }

    await client.query('COMMIT');
    inTransaction = false;

    const token = signToken(user);
    res.status(201).json({ token, user: safeUser(user) });
  } catch (err) {
    if (inTransaction) await client.query('ROLLBACK');
    next(err);
  } finally {
    client.release();
  }
}

export async function login(req, res, next) {
  try {
    const identifier = String(req.body.identifier ?? req.body.email ?? '').trim();
    const { password } = req.body;

    if (!identifier) {
      return next(createError(400, 'VALIDATION_ERROR', 'Email or registration number is required'));
    }

    const { rows } = await query(
      `SELECT id, name, email, role, registration_number, password_hash, must_change_password, is_active
       FROM users
       WHERE LOWER(email) = LOWER($1) OR registration_number = $1
       LIMIT 1`,
      [identifier]
    );

    const user = rows[0];
    if (!user) {
      return next(createError(401, 'UNAUTHORIZED', 'Invalid email or password'));
    }
    if (!user.is_active) {
      return next(createError(403, 'USER_INACTIVE', 'This account has been deactivated'));
    }

    const match = await bcrypt.compare(password, user.password_hash);
    if (!match) {
      return next(createError(401, 'UNAUTHORIZED', 'Invalid email or password'));
    }

    const token = signToken(user);
    res.json({ token, user: safeUser(user) });
  } catch (err) {
    next(err);
  }
}

export async function changePassword(req, res, next) {
  try {
    const { current_password, new_password } = req.body;
    const userId = req.user.id;

    const { rows } = await query(
      'SELECT password_hash FROM users WHERE id = $1',
      [userId]
    );
    if (!rows[0]) return next(createError(404, 'USER_NOT_FOUND', 'User not found'));

    const match = await bcrypt.compare(current_password, rows[0].password_hash);
    if (!match) {
      return next(createError(401, 'UNAUTHORIZED', 'Current password is incorrect'));
    }

    const hash = await bcrypt.hash(new_password, SALT_ROUNDS);
    await query(
      `UPDATE users SET password_hash = $1, must_change_password = false WHERE id = $2`,
      [hash, userId]
    );

    res.json({ message: 'Password updated successfully' });
  } catch (err) {
    next(err);
  }
}

export async function getMe(req, res, next) {
  try {
    const { rows } = await query(
      `SELECT u.id, u.name, u.email, u.role, u.registration_number, u.must_change_password, u.created_at,
              sp.admission_year,
              sas.programme_id, sas.branch_id, sas.current_semester, sas.section, sas.academic_year
       FROM users u
       LEFT JOIN student_profiles sp ON sp.user_id = u.id
       LEFT JOIN student_academic_status sas ON sas.user_id = u.id
       WHERE u.id = $1`,
      [req.user.id]
    );
    if (!rows[0]) return next(createError(404, 'USER_NOT_FOUND', 'User not found'));
    res.json(rows[0]);
  } catch (err) {
    next(err);
  }
}
