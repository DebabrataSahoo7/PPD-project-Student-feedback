import { query, getClient } from '../db/pool.js';
import { createError } from '../middleware/errorHandler.js';

// ── POST /forms/:formId/questions ─────────────────────────────
export async function createQuestion(req, res, next) {
  const { formId } = req.params;
  const { order_index, text, type, required, dimension,
          scale_min, scale_max, scale_labels, rows = [], options = [] } = req.body;

  // dimension only allowed on grid questions
  if (dimension && type !== 'grid') {
    return next(createError(400, 'VALIDATION_ERROR', 'dimension can only be set on grid questions'));
  }

  const client = await getClient();
  try {
    await client.query('BEGIN');

    const form = await client.query(
      'SELECT id, mode, branch_id, semester FROM forms WHERE id = $1',
      [formId]
    );
    if (form.rowCount === 0) {
      await client.query('ROLLBACK');
      return next(createError(404, 'FORM_NOT_FOUND', 'Form not found'));
    }
    const formContext = form.rows[0];

    const { rows: qRows } = await client.query(
      `INSERT INTO questions
         (form_id, order_index, text, type, required, dimension,
          scale_min, scale_max, scale_labels)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9)
       RETURNING id, form_id, type, order_index`,
      [formId, order_index ?? 0, text, type, required ?? true,
       dimension ?? null, scale_min ?? 1, scale_max ?? 5,
       scale_labels ?? null]
    );
    const question = qRows[0];

    // Insert rows (grid questions)
    for (const r of rows) {
      if (formContext.mode === 'academic' && r.subject_id) {
        const subjectCheck = await client.query(
          `SELECT id
           FROM subjects
           WHERE id = $1 AND branch_id = $2 AND semester = $3`,
          [r.subject_id, formContext.branch_id, formContext.semester]
        );
        if (subjectCheck.rowCount === 0) {
          await client.query('ROLLBACK');
          return next(createError(400, 'INVALID_SUBJECT_CONTEXT', 'Subject rows must belong to the form branch and semester'));
        }
      }
      await client.query(
        `INSERT INTO question_rows (question_id, subject_id, label, order_index)
         VALUES ($1, $2, $3, $4)`,
        [question.id, r.subject_id ?? null, r.label, r.order_index ?? 0]
      );
    }

    // Insert options (mcq / checkbox / dropdown)
    for (const o of options) {
      await client.query(
        `INSERT INTO question_options (question_id, label, order_index)
         VALUES ($1, $2, $3)`,
        [question.id, o.label, o.order_index ?? 0]
      );
    }

    await client.query('COMMIT');
    res.status(201).json(question);
  } catch (err) {
    await client.query('ROLLBACK');
    next(err);
  } finally {
    client.release();
  }
}

// ── PUT /questions/:id ────────────────────────────────────────
export async function updateQuestion(req, res, next) {
  const { id } = req.params;
  const { text, type, required, dimension, order_index,
          scale_min, scale_max, scale_labels, rows = [], options = [] } = req.body;

  const client = await getClient();
  try {
    await client.query('BEGIN');

    const existing = await client.query(
      `SELECT q.id, q.type, q.form_id, f.mode, f.branch_id, f.semester
       FROM questions q
       JOIN forms f ON f.id = q.form_id
       WHERE q.id = $1`,
      [id]
    );
    if (existing.rowCount === 0) {
      await client.query('ROLLBACK');
      return next(createError(404, 'QUESTION_NOT_FOUND', 'Question not found'));
    }

    const currentType = existing.rows[0].type;
    const formId      = existing.rows[0].form_id;
    const formMode    = existing.rows[0].mode;
    const branchId    = existing.rows[0].branch_id;
    const semester    = existing.rows[0].semester;

    // Block type change if responses exist
    if (type && type !== currentType) {
      const respCount = await client.query(
        'SELECT COUNT(*) FROM responses WHERE form_id = $1',
        [formId]
      );
      if (Number(respCount.rows[0].count) > 0) {
        await client.query('ROLLBACK');
        return next(createError(409, 'QUESTION_TYPE_LOCKED', 'Cannot change question type after responses have been collected'));
      }
    }

    const resolvedType = type ?? currentType;
    if (dimension && resolvedType !== 'grid') {
      await client.query('ROLLBACK');
      return next(createError(400, 'VALIDATION_ERROR', 'dimension can only be set on grid questions'));
    }

    const { rows: updated } = await client.query(
      `UPDATE questions
       SET text         = COALESCE($1, text),
           type         = COALESCE($2, type),
           required     = COALESCE($3, required),
           dimension    = COALESCE($4, dimension),
           order_index  = COALESCE($5, order_index),
           scale_min    = COALESCE($6, scale_min),
           scale_max    = COALESCE($7, scale_max),
           scale_labels = COALESCE($8, scale_labels)
       WHERE id = $9
       RETURNING id, text, updated_at`,
      [text ?? null, type ?? null, required ?? null, dimension ?? null,
       order_index ?? null, scale_min ?? null, scale_max ?? null,
       scale_labels ?? null, id]
    );

    // Replace rows
    await client.query('DELETE FROM question_rows WHERE question_id = $1', [id]);
    for (const r of rows) {
      if (formMode === 'academic' && r.subject_id) {
        const subjectCheck = await client.query(
          `SELECT id
           FROM subjects
           WHERE id = $1 AND branch_id = $2 AND semester = $3`,
          [r.subject_id, branchId, semester]
        );
        if (subjectCheck.rowCount === 0) {
          await client.query('ROLLBACK');
          return next(createError(400, 'INVALID_SUBJECT_CONTEXT', 'Subject rows must belong to the form branch and semester'));
        }
      }
      await client.query(
        `INSERT INTO question_rows (question_id, subject_id, label, order_index)
         VALUES ($1, $2, $3, $4)`,
        [id, r.subject_id ?? null, r.label, r.order_index ?? 0]
      );
    }

    // Replace options
    await client.query('DELETE FROM question_options WHERE question_id = $1', [id]);
    for (const o of options) {
      await client.query(
        `INSERT INTO question_options (question_id, label, order_index)
         VALUES ($1, $2, $3)`,
        [id, o.label, o.order_index ?? 0]
      );
    }

    await client.query('COMMIT');
    res.json(updated[0]);
  } catch (err) {
    await client.query('ROLLBACK');
    next(err);
  } finally {
    client.release();
  }
}

// ── DELETE /questions/:id ─────────────────────────────────────
export async function deleteQuestion(req, res, next) {
  try {
    const { id } = req.params;
    const result = await query('DELETE FROM questions WHERE id = $1', [id]);
    if (result.rowCount === 0) return next(createError(404, 'QUESTION_NOT_FOUND', 'Question not found'));
    res.json({ message: 'Question deleted' });
  } catch (err) {
    next(err);
  }
}

// ── PATCH /forms/:formId/questions/reorder ────────────────────
export async function reorderQuestions(req, res, next) {
  const { formId } = req.params;
  const { order }  = req.body; // array of question UUIDs

  const client = await getClient();
  try {
    await client.query('BEGIN');

    for (let i = 0; i < order.length; i++) {
      await client.query(
        `UPDATE questions SET order_index = $1 WHERE id = $2 AND form_id = $3`,
        [i, order[i], formId]
      );
    }

    await client.query('COMMIT');
    res.json({ message: 'Questions reordered' });
  } catch (err) {
    await client.query('ROLLBACK');
    next(err);
  } finally {
    client.release();
  }
}
