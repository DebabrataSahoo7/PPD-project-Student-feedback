import { query } from '../db/pool.js';
import { createError } from '../middleware/errorHandler.js';

// ── POST /subjects/:subjectId/cos ────────────────────────────
export async function createCO(req, res, next) {
  try {
    const { subjectId } = req.params;
    const { co_code, description, order_index = 0 } = req.body;

    const subj = await query('SELECT id FROM subjects WHERE id = $1', [subjectId]);
    if (subj.rowCount === 0) return next(createError(404, 'SUBJECT_NOT_FOUND', 'Subject not found'));

    const { rows } = await query(
      `INSERT INTO course_outcomes (subject_id, co_code, description, order_index)
       VALUES ($1, $2, $3, $4)
       RETURNING id, subject_id, co_code, description, order_index`,
      [subjectId, co_code, description, order_index]
    );
    res.status(201).json(rows[0]);
  } catch (err) {
    if (err.code === '23505') return next(createError(409, 'DUPLICATE_CO_CODE', 'CO code already exists for this subject'));
    next(err);
  }
}

// ── GET /subjects/:subjectId/cos ─────────────────────────────
export async function listCOs(req, res, next) {
  try {
    const { subjectId } = req.params;

    const subj = await query('SELECT id FROM subjects WHERE id = $1', [subjectId]);
    if (subj.rowCount === 0) return next(createError(404, 'SUBJECT_NOT_FOUND', 'Subject not found'));

    const { rows } = await query(
      `SELECT id, co_code, description, order_index
       FROM course_outcomes WHERE subject_id = $1 ORDER BY order_index`,
      [subjectId]
    );
    res.json({ data: rows });
  } catch (err) {
    next(err);
  }
}

// ── PUT /cos/:id ─────────────────────────────────────────────
export async function updateCO(req, res, next) {
  try {
    const { id } = req.params;
    const { co_code, description, order_index } = req.body;

    const existing = await query('SELECT id FROM course_outcomes WHERE id = $1', [id]);
    if (existing.rowCount === 0) return next(createError(404, 'CO_NOT_FOUND', 'Course outcome not found'));

    const { rows } = await query(
      `UPDATE course_outcomes
       SET co_code     = COALESCE($1, co_code),
           description = COALESCE($2, description),
           order_index = COALESCE($3, order_index)
       WHERE id = $4
       RETURNING id, co_code, description`,
      [co_code ?? null, description ?? null, order_index ?? null, id]
    );
    res.json(rows[0]);
  } catch (err) {
    if (err.code === '23505') return next(createError(409, 'DUPLICATE_CO_CODE', 'CO code already exists for this subject'));
    next(err);
  }
}

// ── DELETE /cos/:id ──────────────────────────────────────────
export async function deleteCO(req, res, next) {
  try {
    const { id } = req.params;
    const result = await query('DELETE FROM course_outcomes WHERE id = $1', [id]);
    if (result.rowCount === 0) return next(createError(404, 'CO_NOT_FOUND', 'Course outcome not found'));
    res.json({ message: 'CO deleted' });
  } catch (err) {
    next(err);
  }
}
