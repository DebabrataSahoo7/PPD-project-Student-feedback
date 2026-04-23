import { query } from '../db/pool.js';
import { createError } from '../middleware/errorHandler.js';

// ── POST /subjects ─────────────────────────
export async function createSubject(req, res, next) {
  try {
    const { branch_id, semester, name, short_code, order_index = 0 } = req.body;

    const branch = await query('SELECT id FROM branches WHERE id = $1', [branch_id]);
    if (branch.rowCount === 0) return next(createError(404, 'BRANCH_NOT_FOUND', 'Branch not found'));

    const { rows } = await query(
      `INSERT INTO subjects (branch_id, semester, name, short_code, order_index)
       VALUES ($1, $2, $3, $4, $5)
       RETURNING id, branch_id, semester, name, short_code, order_index`,
      [branch_id, semester, name, short_code, order_index]
    );
    res.status(201).json(rows[0]);
  } catch (err) {
    if (err.code === '23505') return next(createError(409, 'DUPLICATE_SHORT_CODE', 'short_code already exists for this branch and semester'));
    next(err);
  }
}

// ── PUT /subjects/:id ────────────────────────────────────────
export async function updateSubject(req, res, next) {
  try {
    const { id } = req.params;
    const { name, short_code, order_index } = req.body;

    const existing = await query('SELECT id FROM subjects WHERE id = $1', [id]);
    if (existing.rowCount === 0) return next(createError(404, 'SUBJECT_NOT_FOUND', 'Subject not found'));

    const { rows } = await query(
      `UPDATE subjects
       SET name        = COALESCE($1, name),
           short_code  = COALESCE($2, short_code),
           order_index = COALESCE($3, order_index)
       WHERE id = $4
       RETURNING id, name`,
      [name ?? null, short_code ?? null, order_index ?? null, id]
    );
    res.json(rows[0]);
  } catch (err) {
    if (err.code === '23505') return next(createError(409, 'DUPLICATE_SHORT_CODE', 'short_code already exists for this branch and semester'));
    next(err);
  }
}

// ── DELETE /subjects/:id ─────────────────────────────────────
export async function deleteSubject(req, res, next) {
  try {
    const { id } = req.params;
    const result = await query('DELETE FROM subjects WHERE id = $1', [id]);
    if (result.rowCount === 0) return next(createError(404, 'SUBJECT_NOT_FOUND', 'Subject not found'));
    res.json({ message: 'Subject deleted' });
  } catch (err) {
    next(err);
  }
}

// ── POST /subjects/:subjectId/faculty ────────────────────────
export async function assignFaculty(req, res, next) {
  try {
    const { subjectId } = req.params;
    const { faculty_id } = req.body;

    const subj = await query('SELECT id FROM subjects WHERE id = $1', [subjectId]);
    if (subj.rowCount === 0) return next(createError(404, 'SUBJECT_NOT_FOUND', 'Subject not found'));

    const fac = await query(`SELECT id FROM users WHERE id = $1 AND role = 'faculty'`, [faculty_id]);
    if (fac.rowCount === 0) return next(createError(404, 'FACULTY_NOT_FOUND', 'Faculty user not found'));

    const { rows } = await query(
      `INSERT INTO subject_faculty (subject_id, faculty_id)
       VALUES ($1, $2)
       RETURNING subject_id, faculty_id, assigned_at`,
      [subjectId, faculty_id]
    );
    res.status(201).json(rows[0]);
  } catch (err) {
    if (err.code === '23505') return next(createError(409, 'ALREADY_ASSIGNED', 'Faculty already assigned to this subject'));
    next(err);
  }
}

// ── DELETE /subjects/:subjectId/faculty/:facultyId ───────────
export async function unassignFaculty(req, res, next) {
  try {
    const { subjectId, facultyId } = req.params;
    const result = await query(
      'DELETE FROM subject_faculty WHERE subject_id = $1 AND faculty_id = $2',
      [subjectId, facultyId]
    );
    if (result.rowCount === 0) return next(createError(404, 'ASSIGNMENT_NOT_FOUND', 'Assignment not found'));
    res.json({ message: 'Faculty unassigned' });
  } catch (err) {
    next(err);
  }
}
