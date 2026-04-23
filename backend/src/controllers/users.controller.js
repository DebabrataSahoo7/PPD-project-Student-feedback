import bcrypt from 'bcrypt';
import { getClient, query } from '../db/pool.js';
import { createError } from '../middleware/errorHandler.js';

const SALT_ROUNDS = 12;

function randomPassword(len = 10) {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789';
  return Array.from({ length: len }, () => chars[Math.floor(Math.random() * chars.length)]).join('');
}

function hasAnyStudentAcademicField(payload) {
  return ['programme_id', 'branch_id', 'current_semester', 'section', 'academic_year'].some((key) => key in payload);
}

function getMissingStudentAcademicContextFields(payload) {
  const required = ['programme_id', 'branch_id', 'current_semester', 'academic_year'];
  return required.filter((key) => !payload[key]);
}

function normalizeLookupValue(value) {
  return String(value ?? '')
    .trim()
    .replace(/\s+/g, ' ')
    .toLowerCase();
}

function normalizeOptionalText(value) {
  const normalized = String(value ?? '').trim();
  return normalized.length > 0 ? normalized : null;
}

function deriveAcademicYearLabel(date = new Date()) {
  const year = date.getUTCFullYear();
  const month = date.getUTCMonth() + 1;
  const startYear = month >= 7 ? year : year - 1;
  const endYearShort = String((startYear + 1) % 100).padStart(2, '0');
  return `${startYear}-${endYearShort}`;
}

function buildStudentPlaceholderEmail(registrationNumber) {
  return `${String(registrationNumber).trim().toLowerCase()}@students.sfc.local`;
}

async function buildAcademicLookup(client) {
  const [programmesRes, branchesRes] = await Promise.all([
    client.query(`SELECT id, name FROM programmes`),
    client.query(
      `SELECT b.id, b.name, b.programme_id, p.name AS programme_name
       FROM branches b
       JOIN programmes p ON p.id = b.programme_id`
    ),
  ]);

  const programmeByName = new Map();
  for (const row of programmesRes.rows) {
    programmeByName.set(normalizeLookupValue(row.name), row.id);
  }

  const branchByProgrammeAndName = new Map();
  for (const row of branchesRes.rows) {
    branchByProgrammeAndName.set(
      `${row.programme_id}:${normalizeLookupValue(row.name)}`,
      row.id
    );
  }

  return { programmeByName, branchByProgrammeAndName };
}

function resolveAcademicContext(user, lookup) {
  if (user.programme_id && user.branch_id) {
    return {
      programme_id: user.programme_id,
      branch_id: user.branch_id,
    };
  }

  const programmeName = user.programme ?? null;
  const branchName = user.branch ?? null;

  if (!programmeName) {
    return { error: `programme or programme_id required for students` };
  }

  const programmeId = lookup.programmeByName.get(normalizeLookupValue(programmeName));
  if (!programmeId) {
    return { error: `Programme not found: ${programmeName}` };
  }

  if (!branchName) {
    return { error: `branch or branch_id required for students` };
  }

  const branchId = lookup.branchByProgrammeAndName.get(
    `${programmeId}:${normalizeLookupValue(branchName)}`
  );
  if (!branchId) {
    return { error: `Branch not found under programme "${programmeName}": ${branchName}` };
  }

  return {
    programme_id: programmeId,
    branch_id: branchId,
  };
}

async function insertFacultyUser(client, { name, email, designation = null, phone = null }) {
  const plainPassword = randomPassword();
  const hash = await bcrypt.hash(plainPassword, SALT_ROUNDS);
  const { rows } = await client.query(
    `INSERT INTO users (name, email, designation, phone, password_hash, role, must_change_password)
     VALUES ($1, $2, $3, $4, $5, 'faculty', true)
     RETURNING id, name, email, designation, phone, role, must_change_password, is_active`,
    [name, email, designation, phone, hash]
  );
  return { user: rows[0], temp_password: plainPassword };
}

// ── GET /users ───────────────────────────────────────────────
export async function listUsers(req, res, next) {
  try {
    const { role, page = 1, limit = 20 } = req.query;
    const offset = (Number(page) - 1) * Number(limit);

    const conditions = [];
    const params     = [];

    if (role) {
      params.push(role);
      conditions.push(`role = $${params.length}`);
    }

    const where = conditions.length ? `WHERE ${conditions.join(' AND ')}` : '';
    const listWhere = conditions.length ? `WHERE ${conditions.map((condition) => condition.replace('role', 'u.role')).join(' AND ')}` : '';

    const countRes = await query(`SELECT COUNT(*) FROM users ${where}`, params);
    const total    = Number(countRes.rows[0].count);

    params.push(Number(limit), offset);
    const { rows } = await query(
      `SELECT u.id, u.name, u.email, u.role, u.registration_number, u.designation, u.phone, u.is_active, u.created_at,
              sp.admission_year, sas.programme_id, sas.branch_id, sas.current_semester, sas.section, sas.academic_year,
              p.name AS programme_name, b.name AS branch_name
       FROM users u
       LEFT JOIN student_profiles sp ON sp.user_id = u.id
        LEFT JOIN student_academic_status sas ON sas.user_id = u.id
       LEFT JOIN programmes p ON sas.programme_id = p.id
       LEFT JOIN branches b ON sas.branch_id = b.id
       ${listWhere}
       GROUP BY u.id, sp.admission_year, sas.programme_id, sas.branch_id, sas.current_semester, sas.section, sas.academic_year, p.name, b.name
       ORDER BY u.created_at DESC
       LIMIT $${params.length - 1} OFFSET $${params.length}`,
      params
    );

    res.json({ data: rows, total, page: Number(page) });
  } catch (err) {
    next(err);
  }
}

// ── POST /users/import ───────────────────────────────────────
export async function importUsers(req, res, next) {
  const client = await getClient();
  try {
    const { users } = req.body;
    const studentRows = users.filter((user) => user.role === 'student');
    const academicLookup = studentRows.length > 0 ? await buildAcademicLookup(client) : null;
    const defaultAcademicYear = deriveAcademicYearLabel();

    let imported = 0;
    let updated  = 0;
    let failed   = 0;
    let skipped = 0;
    const errors = [];
    const imported_faculty_credentials = [];
    const seenEmails = new Set();
    const seenRegistrationNumbers = new Set();

    const inputEmails = [
      ...new Set(
        users
          .map((user) => normalizeOptionalText(user.email))
          .filter(Boolean)
          .map((email) => email.toLowerCase())
      ),
    ];
    const inputRegistrationNumbers = [
      ...new Set(
        studentRows
          .map((user) => user.registration_number)
          .filter(Boolean)
      ),
    ];

    const existingUsersByEmail = new Map();
    if (inputEmails.length > 0) {
      const { rows } = await client.query(
        `SELECT id, role, LOWER(email) AS normalized_email
         FROM users
         WHERE LOWER(email) = ANY($1)`,
        [inputEmails]
      );
      for (const row of rows) {
        existingUsersByEmail.set(row.normalized_email, row);
      }
    }

    const existingRegistrationNumbers = new Set();
    if (inputRegistrationNumbers.length > 0) {
      const { rows } = await client.query(
        `SELECT registration_number
         FROM users
         WHERE registration_number = ANY($1)`,
        [inputRegistrationNumbers]
      );
      for (const row of rows) {
        existingRegistrationNumbers.add(row.registration_number);
      }
    }

    for (let i = 0; i < users.length; i++) {
      const u = users[i];
      const rowNumber = u.source_row ?? i + 2;
      try {
        const inputEmail = normalizeOptionalText(u.email);
        const effectiveEmail = inputEmail ?? (u.role === 'student' && u.registration_number
          ? buildStudentPlaceholderEmail(u.registration_number)
          : null);

        if (!effectiveEmail) {
          errors.push({ row: rowNumber, reason: 'email required for faculty' });
          failed++;
          skipped++;
          continue;
        }

        const normalizedEmail = effectiveEmail.toLowerCase();
        if (seenEmails.has(normalizedEmail)) {
          errors.push({ row: rowNumber, reason: 'Duplicate email in uploaded CSV' });
          failed++;
          skipped++;
          continue;
        }
        seenEmails.add(normalizedEmail);

        const existingUser = existingUsersByEmail.get(normalizedEmail);

        let plainPassword;
        let resolvedProgrammeId = u.programme_id ?? null;
        let resolvedBranchId = u.branch_id ?? null;
        if (u.role === 'student') {
          if (existingUser) {
            errors.push({ row: rowNumber, reason: 'Email already exists' });
            failed++;
            skipped++;
            continue;
          }
          if (!u.registration_number) {
            errors.push({ row: rowNumber, reason: 'registration_number required for students' });
            failed++;
            skipped++;
            continue;
          }
          if (seenRegistrationNumbers.has(u.registration_number)) {
            errors.push({ row: rowNumber, reason: 'Duplicate registration_number in uploaded CSV' });
            failed++;
            skipped++;
            continue;
          }
          seenRegistrationNumbers.add(u.registration_number);
          if (existingRegistrationNumbers.has(u.registration_number)) {
            errors.push({ row: rowNumber, reason: 'registration_number already exists' });
            failed++;
            skipped++;
            continue;
          }
          if (!u.admission_year) {
            errors.push({ row: rowNumber, reason: 'admission_year required for students' });
            failed++;
            skipped++;
            continue;
          }
          const resolvedContext = resolveAcademicContext(u, academicLookup);
          if (resolvedContext.error) {
            errors.push({ row: rowNumber, reason: resolvedContext.error });
            failed++;
            skipped++;
            continue;
          }
          resolvedProgrammeId = resolvedContext.programme_id;
          resolvedBranchId = resolvedContext.branch_id;
          const academicYear = u.academic_year ?? defaultAcademicYear;

          const missingAcademicFields = getMissingStudentAcademicContextFields({
            ...u,
            programme_id: resolvedProgrammeId,
            branch_id: resolvedBranchId,
            academic_year: academicYear,
          });
          if (missingAcademicFields.length) {
            errors.push({ row: rowNumber, reason: `${missingAcademicFields.join(', ')} required for student academic status` });
            failed++;
            skipped++;
            continue;
          }
          plainPassword = u.registration_number;
        } else {
          if (existingUser) {
            if (existingUser.role !== 'faculty') {
              errors.push({ row: rowNumber, reason: `Email already belongs to ${existingUser.role}` });
              failed++;
              skipped++;
              continue;
            }

            await client.query(
              `UPDATE users
               SET name = $1,
                   designation = COALESCE($2, designation),
                   phone = COALESCE($3, phone),
                   updated_at = NOW()
               WHERE id = $4`,
              [u.name, u.designation ?? null, u.phone ?? null, existingUser.id]
            );
            updated++;
            continue;
          }

          plainPassword = randomPassword();
          imported_faculty_credentials.push({ email: u.email, temp_password: plainPassword });
        }

        const hash = await bcrypt.hash(plainPassword, SALT_ROUNDS);
        await client.query('BEGIN');
        const insertRes = await client.query(
          `INSERT INTO users (name, email, designation, phone, password_hash, role, registration_number, must_change_password)
           VALUES ($1, $2, $3, $4, $5, $6, $7, true)
           RETURNING id`,
          [u.name, effectiveEmail, u.designation ?? null, u.phone ?? null, hash, u.role, u.registration_number || null]
        );
        const userId = insertRes.rows[0].id;
        if (u.role === 'student') {
          await client.query(
            `INSERT INTO student_profiles (user_id, admission_year)
             VALUES ($1, $2)`,
            [userId, u.admission_year]
          );
          await client.query(
            `INSERT INTO student_academic_status (user_id, programme_id, branch_id, current_semester, section, academic_year)
             VALUES ($1, $2, $3, $4, $5, $6)`,
            [userId, resolvedProgrammeId, resolvedBranchId, u.current_semester, u.section ?? null, u.academic_year ?? defaultAcademicYear]
          );
          existingRegistrationNumbers.add(u.registration_number);
        }
        await client.query('COMMIT');
        imported++;
        existingUsersByEmail.set(normalizedEmail, { id: userId, role: u.role, normalized_email: normalizedEmail });
      } catch (rowErr) {
        try { await client.query('ROLLBACK'); } catch {}
        errors.push({ row: rowNumber, reason: rowErr.message });
        failed++;
        skipped++;
      }
    }

    res.status(201).json({
      inserted: imported,
      skipped,
      imported,
      updated,
      failed,
      errors,
      imported_faculty_credentials,
      message: 'Import complete. Faculty temporary passwords are shown ONCE — store them securely.',
    });
  } catch (err) {
    next(err);
  } finally {
    client.release();
  }
}

// ── PATCH /users/:id ─────────────────────────────────────────
export async function updateUser(req, res, next) {
  const client = await getClient();
  let inTransaction = false;
  try {
    const { id } = req.params;
    const { name, email, registration_number, designation, phone, is_active, programme_id, branch_id, current_semester, section, academic_year, admission_year } = req.body;

    const existing = await client.query('SELECT id, role FROM users WHERE id = $1', [id]);
    if (existing.rowCount === 0) {
      return next(createError(404, 'USER_NOT_FOUND', 'User not found'));
    }
    const user = existing.rows[0];

    // Check email uniqueness if changing
    if (email) {
      const dup = await client.query('SELECT id FROM users WHERE email = $1 AND id != $2', [email, id]);
      if (dup.rowCount > 0) return next(createError(409, 'EMAIL_EXISTS', 'Email already in use'));
    }

    const academicPayloadPresent = hasAnyStudentAcademicField(req.body);
    if (academicPayloadPresent && user.role !== 'student') {
      return next(createError(400, 'VALIDATION_ERROR', 'Academic profile fields can only be updated for student users'));
    }

    await client.query('BEGIN');
    inTransaction = true;
    const { rows } = await client.query(
      `UPDATE users
       SET name                = COALESCE($1, name),
           email               = COALESCE($2, email),
           registration_number = COALESCE($3, registration_number),
           designation         = COALESCE($4, designation),
           phone               = COALESCE($5, phone),
           is_active           = COALESCE($6, is_active)
       WHERE id = $7
       RETURNING id, name, email, designation, phone, is_active`,
      [name ?? null, email ?? null, registration_number ?? null, designation ?? null, phone ?? null, is_active ?? null, id]
    );

    if (user.role === 'student' && academicPayloadPresent) {
      const profileRes = await client.query(
        `SELECT admission_year
         FROM student_profiles WHERE user_id = $1`,
        [id]
      );
      const currentProfile = profileRes.rows[0] ?? {};
      const statusRes = await client.query(
        `SELECT programme_id, branch_id, current_semester, section, academic_year
         FROM student_academic_status WHERE user_id = $1`,
        [id]
      );
      const currentStatus = statusRes.rows[0] ?? {};

      const nextProfile = {
        admission_year: admission_year ?? currentProfile.admission_year ?? null,
      };
      const nextStatus = {
        programme_id: programme_id ?? currentStatus.programme_id ?? null,
        branch_id: branch_id ?? currentStatus.branch_id ?? null,
        current_semester: current_semester ?? currentStatus.current_semester ?? null,
        section: section ?? currentStatus.section ?? null,
        academic_year: academic_year ?? currentStatus.academic_year ?? null,
      };

      if (!nextProfile.admission_year) {
        await client.query('ROLLBACK');
        inTransaction = false;
        return next(createError(400, 'VALIDATION_ERROR', 'admission_year required for student profile'));
      }

      const missingAcademicFields = getMissingStudentAcademicContextFields(nextStatus);
      if (missingAcademicFields.length) {
        await client.query('ROLLBACK');
        inTransaction = false;
        return next(createError(400, 'VALIDATION_ERROR', `${missingAcademicFields.join(', ')} required for student academic status`));
      }

      await client.query(
        `INSERT INTO student_profiles (user_id, admission_year)
         VALUES ($1, $2)
         ON CONFLICT (user_id) DO UPDATE SET
           admission_year = EXCLUDED.admission_year,
           updated_at = NOW()`,
        [id, nextProfile.admission_year]
      );

      await client.query(
        `INSERT INTO student_academic_status (user_id, programme_id, branch_id, current_semester, section, academic_year)
         VALUES ($1, $2, $3, $4, $5, $6)
         ON CONFLICT (user_id) DO UPDATE SET
           programme_id = EXCLUDED.programme_id,
           branch_id = EXCLUDED.branch_id,
           current_semester = EXCLUDED.current_semester,
           section = EXCLUDED.section,
           academic_year = EXCLUDED.academic_year,
           updated_at = NOW()`,
        [id, nextStatus.programme_id, nextStatus.branch_id, nextStatus.current_semester, nextStatus.section, nextStatus.academic_year]
      );
    }

    await client.query('COMMIT');
    inTransaction = false;

    res.json(rows[0]);
  } catch (err) {
    if (inTransaction) await client.query('ROLLBACK');
    next(err);
  } finally {
    client.release();
  }
}

// ── POST /users/faculty ───────────────────────────────────────
export async function createFaculty(req, res, next) {
  const client = await getClient();
  try {
    const { name, email, designation = null, phone = null } = req.body;
    const dup = await client.query('SELECT id FROM users WHERE email = $1', [email]);
    if (dup.rowCount > 0) {
      return next(createError(409, 'EMAIL_EXISTS', 'Email already exists'));
    }

    const created = await insertFacultyUser(client, { name, email, designation, phone });
    res.status(201).json({
      user: created.user,
      temp_password: created.temp_password,
      message: 'Faculty created. Temporary password is shown ONCE — store it securely.',
    });
  } catch (err) {
    next(err);
  } finally {
    client.release();
  }
}
