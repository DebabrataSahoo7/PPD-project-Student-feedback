import { query, getClient } from '../db/pool.js';
import { createError } from '../middleware/errorHandler.js';
import { TEMPLATES } from '../data/templates.js';

/**
 * POST /forms/:id/apply-template
 * Seeds pre-built questions into a draft form.
 * Only works if the form has zero existing questions.
 * For academic forms, creates grid questions with subject rows
 * from the form's branch + semester context.
 */
export async function applyTemplate(req, res, next) {
  const { id: formId } = req.params;
  const { template }   = req.body;

  if (!template || !TEMPLATES[template]) {
    return next(createError(400, 'INVALID_TEMPLATE', `Unknown template: ${template}`));
  }

  const client = await getClient();
  try {
    await client.query('BEGIN');

    // Verify form exists and is draft
    const { rows: formRows } = await client.query(
      `SELECT id, mode, branch_id, semester, status FROM forms WHERE id = $1`,
      [formId]
    );
    if (!formRows[0]) {
      await client.query('ROLLBACK');
      return next(createError(404, 'FORM_NOT_FOUND', 'Form not found'));
    }
    const form = formRows[0];
    if (form.status !== 'draft') {
      await client.query('ROLLBACK');
      return next(createError(400, 'FORM_NOT_DRAFT', 'Templates can only be applied to draft forms'));
    }

    // Check no existing questions
    const { rows: existing } = await client.query(
      'SELECT COUNT(*)::int AS cnt FROM questions WHERE form_id = $1',
      [formId]
    );
    if (existing[0].cnt > 0) {
      await client.query('ROLLBACK');
      return next(createError(409, 'QUESTIONS_EXIST', 'Form already has questions. Clear them first.'));
    }

    // Load subjects for academic forms (for grid rows)
    let subjects = [];
    if (form.mode === 'academic' && form.branch_id && form.semester) {
      const { rows } = await client.query(
        `SELECT id, name, short_code, order_index
         FROM subjects WHERE branch_id = $1 AND semester = $2
         ORDER BY order_index`,
        [form.branch_id, form.semester]
      );
      subjects = rows;
    }

    const tpl = TEMPLATES[template];
    let created = 0;

    for (let i = 0; i < tpl.questions.length; i++) {
      const q = tpl.questions[i];

      // Insert question
      const { rows: qRows } = await client.query(
        `INSERT INTO questions
           (form_id, order_index, text, type, required, dimension, scale_min, scale_max)
         VALUES ($1, $2, $3, $4, $5, $6, 1, 5)
         RETURNING id`,
        [formId, i, q.text, q.type, q.required, q.dimension ?? null]
      );
      const qId = qRows[0].id;

      // For grid questions on academic forms, add subject rows
      if (q.type === 'grid' && subjects.length > 0) {
        for (let j = 0; j < subjects.length; j++) {
          await client.query(
            `INSERT INTO question_rows (question_id, subject_id, label, order_index)
             VALUES ($1, $2, $3, $4)`,
            [qId, subjects[j].id, subjects[j].name, j]
          );
        }
      }

      created++;
    }

    await client.query('COMMIT');
    res.status(201).json({ questions_created: created, message: 'Template applied' });
  } catch (err) {
    await client.query('ROLLBACK');
    next(err);
  } finally {
    client.release();
  }
}
