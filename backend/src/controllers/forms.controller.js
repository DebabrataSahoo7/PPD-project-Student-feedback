import { query } from '../db/pool.js';
import { createError } from '../middleware/errorHandler.js';
import { randomBytes } from 'crypto';
import { getStudentAcademicContext } from '../utils/studentProfiles.js';
import { notify } from '../utils/notify.js';

function generateShareToken() {
  return randomBytes(32).toString('hex');
}

export async function createForm(req, res, next) {
  try {
    let { title, description, mode, programme_id, branch_id, semester, academic_year,
          is_anonymous, require_login, allow_multiple_responses, starts_at, ends_at } = req.body;

    if (mode === 'academic') require_login = true;

    if (mode === 'academic' && (!programme_id || !branch_id || !semester || !academic_year)) {
      return next(createError(400, 'VALIDATION_ERROR', 'programme_id, branch_id, semester and academic_year are required for academic forms'));
    }

    const share_token = generateShareToken();
    const { rows } = await query(
      `INSERT INTO forms
         (title, description, creator_id, mode, programme_id, branch_id, semester, academic_year,
          is_anonymous, require_login, allow_multiple_responses, share_token, starts_at, ends_at)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14)
       RETURNING id, title, mode, share_token, status, created_at`,
      [title, description ?? null, req.user.id, mode,
       programme_id ?? null, branch_id ?? null, semester ?? null, academic_year ?? null,
       is_anonymous ?? false, require_login ?? false, allow_multiple_responses ?? false,
       share_token, starts_at ?? null, ends_at ?? null]
    );
    res.status(201).json(rows[0]);
  } catch (err) { next(err); }
}

export async function listForms(req, res, next) {
  try {
    const { mode, status, page = 1, limit = 20 } = req.query;
    const offset = (Number(page) - 1) * Number(limit);

    if (req.user.role === 'student') {
      const context = await getStudentAcademicContext({ query }, req.user.id);
      if (!context) {
        return next(createError(403, 'STUDENT_PROFILE_INCOMPLETE', 'Your student academic status is incomplete'));
      }

      const params = [req.user.id];
      let where = `
        WHERE f.mode = 'academic'
          AND f.status = 'published'
          AND f.programme_id = sas.programme_id
          AND f.branch_id = sas.branch_id
          AND f.semester = sas.current_semester
          AND f.academic_year = sas.academic_year
          AND (f.starts_at IS NULL OR f.starts_at <= NOW())
          AND (f.ends_at IS NULL OR f.ends_at >= NOW())
      `;

      if (mode) {
        params.push(mode);
        where += ' AND f.mode = $' + params.length;
      }
      if (status) {
        params.push(status);
        where += ' AND f.status = $' + params.length;
      }

      const countRes = await query(
        `SELECT COUNT(*) FROM forms f
         JOIN student_academic_status sas ON sas.user_id = $1
         ${where}`,
        params
      );
      const total = Number(countRes.rows[0].count);

      const li = params.length + 1;
      const oi = params.length + 2;
      params.push(Number(limit), offset);

      const { rows } = await query(
        `SELECT f.id, f.title, f.mode, f.status, f.share_token, f.starts_at, f.ends_at,
                f.programme_id, f.branch_id, f.semester, f.academic_year
         FROM forms f
         JOIN student_academic_status sas ON sas.user_id = $1
         ${where}
         ORDER BY f.created_at DESC
         LIMIT $${li} OFFSET $${oi}`,
        params
      );

      return res.json({ data: rows, total });
    }

    const params = [];
    const conds = [];

    if (req.user.role === 'faculty') {
      params.push(req.user.id);
      const n = params.length;
      conds.push('EXISTS (SELECT 1 FROM subjects s JOIN subject_faculty sf ON sf.subject_id = s.id WHERE sf.faculty_id = $' + n + ' AND s.branch_id = f.branch_id AND s.semester = f.semester)');
    }
    if (mode)   { params.push(mode);   conds.push('f.mode = $' + params.length); }
    if (status) { params.push(status); conds.push('f.status = $' + params.length); }

    const where = conds.length ? 'WHERE ' + conds.join(' AND ') : '';
    const countRes = await query('SELECT COUNT(*) FROM forms f ' + where, params);
    const total = Number(countRes.rows[0].count);

    const li = params.length + 1;
    const oi = params.length + 2;
    params.push(Number(limit), offset);

    const { rows } = await query(
      'SELECT f.id, f.title, f.mode, f.status, f.share_token, (SELECT COUNT(*) FROM responses r WHERE r.form_id = f.id)::int AS response_count, f.starts_at, f.ends_at FROM forms f ' + where + ' ORDER BY f.created_at DESC LIMIT $' + li + ' OFFSET $' + oi,
      params
    );
    res.json({ data: rows, total });
  } catch (err) { next(err); }
}

export async function getForm(req, res, next) {
  try {
    const { id } = req.params;
    const { rows } = await query(
      `SELECT id, title, description, mode, programme_id, branch_id, semester, academic_year,
              is_anonymous, require_login, allow_multiple_responses, share_token, status, starts_at, ends_at
       FROM forms WHERE id = $1`, [id]
    );
    if (!rows[0]) return next(createError(404, 'FORM_NOT_FOUND', 'Form not found'));
    const form = rows[0];

    if (req.user.role === 'faculty' && form.mode === 'academic') {
      const check = await query(
        `SELECT 1 FROM subjects s JOIN subject_faculty sf ON sf.subject_id = s.id
         WHERE sf.faculty_id = $1 AND s.branch_id = $2 AND s.semester = $3 LIMIT 1`,
        [req.user.id, form.branch_id, form.semester]
      );
      if (!check.rowCount) return next(createError(403, 'FORBIDDEN', 'You do not have access to this form'));
    }

    const { rows: questions } = await query(
      `SELECT id, order_index, text, type, required, dimension, scale_min, scale_max, scale_labels
       FROM questions WHERE form_id = $1 ORDER BY order_index`, [id]
    );
    for (const q of questions) {
      const { rows: qrows } = await query(`SELECT id, label, subject_id, order_index FROM question_rows WHERE question_id = $1 ORDER BY order_index`, [q.id]);
      const { rows: opts }  = await query(`SELECT id, label, order_index FROM question_options WHERE question_id = $1 ORDER BY order_index`, [q.id]);
      q.rows = qrows; q.options = opts;
    }
    form.questions = questions;
    res.json(form);
  } catch (err) { next(err); }
}

export async function updateForm(req, res, next) {
  try {
    const { id } = req.params;
    let { title, description, mode, programme_id, branch_id, semester, academic_year,
          is_anonymous, require_login, allow_multiple_responses, starts_at, ends_at } = req.body;

    const existing = await query(
      `SELECT id, mode, programme_id, branch_id, semester, academic_year
       FROM forms WHERE id = $1`,
      [id]
    );
    if (!existing.rowCount) return next(createError(404, 'FORM_NOT_FOUND', 'Form not found'));
    const current = existing.rows[0];

    const nextMode = mode ?? current.mode;
    const nextProgrammeId = programme_id ?? current.programme_id;
    const nextBranchId = branch_id ?? current.branch_id;
    const nextSemester = semester ?? current.semester;
    const nextAcademicYear = academic_year ?? current.academic_year;

    if (nextMode === 'academic' && (!nextProgrammeId || !nextBranchId || !nextSemester || !nextAcademicYear)) {
      return next(createError(400, 'VALIDATION_ERROR', 'programme_id, branch_id, semester and academic_year are required for academic forms'));
    }
    if (mode === 'academic') require_login = true;

    const { rows } = await query(
      `UPDATE forms SET
         title=COALESCE($1,title), description=COALESCE($2,description), mode=COALESCE($3,mode),
         programme_id=COALESCE($4,programme_id), branch_id=COALESCE($5,branch_id),
         semester=COALESCE($6,semester), academic_year=COALESCE($7,academic_year),
         is_anonymous=COALESCE($8,is_anonymous), require_login=COALESCE($9,require_login),
         allow_multiple_responses=COALESCE($10,allow_multiple_responses),
         starts_at=COALESCE($11,starts_at), ends_at=COALESCE($12,ends_at)
       WHERE id=$13 RETURNING id, title, updated_at`,
      [title, description ?? null, mode ?? null, programme_id ?? null, branch_id ?? null,
       semester ?? null, academic_year ?? null, is_anonymous ?? null, require_login ?? null,
       allow_multiple_responses ?? null, starts_at ?? null, ends_at ?? null, id]
    );
    res.json(rows[0]);
  } catch (err) { next(err); }
}

export async function publishForm(req, res, next) {
  try {
    const { id } = req.params;
    const { rows } = await query(`UPDATE forms SET status='published' WHERE id=$1 AND status='draft' RETURNING id, status, share_token, title, branch_id, semester`, [id]);
    if (!rows.length) {
      const f = await query('SELECT id FROM forms WHERE id=$1', [id]);
      if (!f.rowCount) return next(createError(404, 'FORM_NOT_FOUND', 'Form not found'));
      return next(createError(400, 'FORM_NOT_DRAFT', 'Only draft forms can be published'));
    }
    const form = rows[0];
    const baseUrl = process.env.APP_BASE_URL || 'http://localhost:3000';

    // Notify assigned faculty that a form they're linked to is now live
    if (form.branch_id && form.semester) {
      const { rows: faculty } = await query(
        `SELECT DISTINCT sf.faculty_id FROM subject_faculty sf
         JOIN subjects s ON s.id = sf.subject_id
         WHERE s.branch_id = $1 AND s.semester = $2`,
        [form.branch_id, form.semester]
      );
      for (const f of faculty) {
        await notify(
          { query },
          f.faculty_id,
          `Form "${form.title}" is now live and accepting responses.`,
          null
        );
      }
    }

    res.json({ id: form.id, status: form.status, share_link: baseUrl + '/f/' + form.share_token });
  } catch (err) { next(err); }
}

export async function closeForm(req, res, next) {
  try {
    const { id } = req.params;
    const { rows } = await query(`UPDATE forms SET status='closed' WHERE id=$1 AND status='published' RETURNING id, status`, [id]);
    if (!rows.length) {
      const f = await query('SELECT id FROM forms WHERE id=$1', [id]);
      if (!f.rowCount) return next(createError(404, 'FORM_NOT_FOUND', 'Form not found'));
      return next(createError(400, 'FORM_NOT_PUBLISHED', 'Only published forms can be closed'));
    }
    res.json(rows[0]);
  } catch (err) { next(err); }
}

export async function deleteForm(req, res, next) {
  try {
    const { id } = req.params;

    // Check form status and response count
    const { rows: formRows } = await query(
      `SELECT status, (SELECT COUNT(*) FROM responses WHERE form_id = forms.id) AS response_count
       FROM forms WHERE id=$1`,
      [id]
    );

    if (!formRows.length) return next(createError(404, 'FORM_NOT_FOUND', 'Form not found'));

    const form = formRows[0];
    const responses = Number(form.response_count);

    if (form.status !== 'draft' && responses > 0) {
      return next(createError(400, 'CANNOT_DELETE', 'Only draft forms or forms with 0 responses can be deleted'));
    }

    await query(`DELETE FROM forms WHERE id=$1`, [id]);
    res.json({ message: 'Form deleted' });
  } catch (err) { next(err); }
}
