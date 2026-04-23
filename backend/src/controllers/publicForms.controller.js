import { query, getClient } from '../db/pool.js';
import { createError } from '../middleware/errorHandler.js';
import { requireEligibleStudentForAcademicForm } from '../utils/studentProfiles.js';
import { notify } from '../utils/notify.js';

async function ensurePublicAccess(db, form, user) {
  if (form.require_login && !user) {
    throw createError(401, 'UNAUTHORIZED', 'Login required to access this form');
  }
  if (form.mode === 'academic') {
    await requireEligibleStudentForAcademicForm(db, user, form);
  }
}

// GET /public/forms/:shareToken
// Returns form metadata + questions (strips dimension/subject_id/scale_labels)
export async function getPublicForm(req, res, next) {
  try {
    const { shareToken } = req.params;

    const { rows } = await query(
      `SELECT id, title, description, mode, programme_id, branch_id, semester, academic_year,
              is_anonymous, require_login, status, starts_at, ends_at
       FROM forms WHERE share_token = $1`,
      [shareToken]
    );
    if (rows.length === 0) return next(createError(404, 'FORM_NOT_FOUND', 'Form not found'));

    const form = rows[0];
    await ensurePublicAccess({ query }, form, req.user);

    const { rows: questions } = await query(
      `SELECT id, order_index, text, type, required
       FROM questions WHERE form_id = $1 ORDER BY order_index`,
      [form.id]
    );

    for (const q of questions) {
      const { rows: qrows } = await query(
        `SELECT id, label, order_index FROM question_rows
         WHERE question_id = $1 ORDER BY order_index`,
        [q.id]
      );
      const { rows: opts } = await query(
        `SELECT id, label, order_index FROM question_options
         WHERE question_id = $1 ORDER BY order_index`,
        [q.id]
      );
      q.rows = qrows;
      q.options = opts;
    }

    res.json({
      id: form.id,
      title: form.title,
      description: form.description,
      is_anonymous: form.is_anonymous,
      require_login: form.require_login,
      questions,
    });
  } catch (err) {
    next(err);
  }
}

// POST /public/forms/:shareToken/responses
export async function submitResponse(req, res, next) {
  const { shareToken } = req.params;
  const { respondent_name, respondent_email, answers } = req.body;

  const client = await getClient();
  try {
    await client.query('BEGIN');

    const { rows: formRows } = await client.query(
      `SELECT id, mode, programme_id, branch_id, semester, academic_year,
              status, require_login, allow_multiple_responses,
              is_anonymous, starts_at, ends_at
       FROM forms WHERE share_token = $1`,
      [shareToken]
    );
    if (formRows.length === 0) {
      await client.query('ROLLBACK');
      return next(createError(404, 'FORM_NOT_FOUND', 'Form not found'));
    }
    const form = formRows[0];

    if (form.status !== 'published') {
      await client.query('ROLLBACK');
      if (form.status === 'closed') return next(createError(410, 'FORM_CLOSED', 'This form is closed'));
      return next(createError(400, 'FORM_NOT_PUBLISHED', 'This form is not accepting responses'));
    }

    const now = new Date();
    if (form.starts_at && now < new Date(form.starts_at)) {
      await client.query('ROLLBACK');
      return next(createError(400, 'FORM_NOT_OPEN', 'This form is not open yet'));
    }
    if (form.ends_at && now > new Date(form.ends_at)) {
      await client.query('ROLLBACK');
      return next(createError(410, 'FORM_CLOSED', 'This form has expired'));
    }

    try {
      await ensurePublicAccess(client, form, req.user);
    } catch (accessErr) {
      await client.query('ROLLBACK');
      return next(accessErr);
    }

    const respondentId = req.user?.id ?? null;
    const respondentEmail = form.is_anonymous ? null : (respondent_email ?? req.user?.email ?? null);
    const respondentName = form.is_anonymous ? null : (respondent_name ?? null);

    if (!form.allow_multiple_responses) {
      if (respondentId) {
        const dup = await client.query(
          'SELECT id FROM responses WHERE form_id = $1 AND respondent_id = $2',
          [form.id, respondentId]
        );
        if (dup.rowCount > 0) {
          await client.query('ROLLBACK');
          return next(createError(409, 'ALREADY_RESPONDED', 'You have already submitted a response for this form'));
        }
      } else if (respondentEmail) {
        const dup = await client.query(
          'SELECT id FROM responses WHERE form_id = $1 AND respondent_email = $2',
          [form.id, respondentEmail]
        );
        if (dup.rowCount > 0) {
          await client.query('ROLLBACK');
          return next(createError(409, 'ALREADY_RESPONDED', 'A response from this email already exists'));
        }
      }
    }

    const { rows: respRows } = await client.query(
      `INSERT INTO responses (form_id, respondent_id, respondent_name, respondent_email)
       VALUES ($1, $2, $3, $4) RETURNING id`,
      [form.id, respondentId, respondentName, respondentEmail]
    );
    const responseId = respRows[0].id;

    for (const ans of answers) {
      const qCheck = await client.query(
        'SELECT id, type, scale_min, scale_max FROM questions WHERE id = $1 AND form_id = $2',
        [ans.question_id, form.id]
      );
      if (qCheck.rowCount === 0) {
        await client.query('ROLLBACK');
        return next(createError(400, 'INVALID_QUESTION', `Question ${ans.question_id} does not belong to this form`));
      }
      const question = qCheck.rows[0];

      const { rows: ansRows } = await client.query(
        `INSERT INTO answers (response_id, question_id, text_value, numeric_value, date_value)
         VALUES ($1, $2, $3, $4, $5) RETURNING id`,
        [responseId, ans.question_id,
         ans.text_value ?? null,
         ans.numeric_value ?? null,
         ans.date_value ?? null]
      );
      const answerId = ansRows[0].id;

      if (question.type === 'grid' && ans.grid_values?.length) {
        const scaleMin = question.scale_min ?? 1;
        const scaleMax = question.scale_max ?? 5;

        for (const gv of ans.grid_values) {
          if (gv.value < scaleMin || gv.value > scaleMax) {
            await client.query('ROLLBACK');
            return next(createError(400, 'INVALID_SCALE_VALUE', `Value ${gv.value} is outside scale range ${scaleMin}-${scaleMax}`));
          }
          const rowCheck = await client.query(
            'SELECT id, subject_id FROM question_rows WHERE id = $1 AND question_id = $2',
            [gv.question_row_id, ans.question_id]
          );
          if (rowCheck.rowCount === 0) {
            await client.query('ROLLBACK');
            return next(createError(400, 'INVALID_ROW', `Row ${gv.question_row_id} not found`));
          }
          await client.query(
            `INSERT INTO answer_grid_values (answer_id, question_row_id, subject_id, value)
             VALUES ($1, $2, $3, $4)`,
            [answerId, gv.question_row_id, rowCheck.rows[0].subject_id, gv.value]
          );
        }
      }

      if (ans.selected_option_ids?.length) {
        for (const optId of ans.selected_option_ids) {
          await client.query(
            `INSERT INTO answer_selected_options (answer_id, option_id) VALUES ($1, $2)`,
            [answerId, optId]
          );
        }
      }
    }

    if (respondentEmail) {
      await client.query(
        `UPDATE email_invites SET responded = true
         WHERE form_id = $1 AND email = $2`,
        [form.id, respondentEmail]
      );
    }

    await triggerMilestoneNotification(client, form.id);

    await client.query('COMMIT');
    res.status(201).json({ message: 'Response submitted successfully', response_id: responseId });
  } catch (err) {
    await client.query('ROLLBACK');
    next(err);
  } finally {
    client.release();
  }
}

async function triggerMilestoneNotification(client, formId) {
  const countRes = await client.query(
    'SELECT COUNT(*)::int AS count FROM responses WHERE form_id = $1',
    [formId]
  );
  const count = countRes.rows[0].count;
  const milestones = [10, 25, 50, 100];
  const isMilestone = milestones.includes(count) || (count > 100 && count % 100 === 0);
  if (!isMilestone) return;

  const formRes = await client.query(
    `SELECT f.id, f.title, f.creator_id FROM forms f WHERE f.id = $1`,
    [formId]
  );
  if (!formRes.rowCount) return;

  const form = formRes.rows[0];
  await notify(
    client,
    form.creator_id,
    `🎉 ${count} responses received for "${form.title}"`,
    `/admin/forms/${form.id}/analytics`
  );
}
