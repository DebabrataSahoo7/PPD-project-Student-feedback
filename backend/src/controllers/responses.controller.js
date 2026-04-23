import { query } from '../db/pool.js';
import { createError } from '../middleware/errorHandler.js';

// ── GET /forms/:id/responses ──────────────────────────────────
export async function listResponses(req, res, next) {
  try {
    const { id: formId } = req.params;
    const { page = 1, limit = 50 } = req.query;
    const offset = (Number(page) - 1) * Number(limit);

    const formCheck = await query('SELECT id FROM forms WHERE id = $1', [formId]);
    if (formCheck.rowCount === 0) return next(createError(404, 'FORM_NOT_FOUND', 'Form not found'));

    // Faculty: collect their assigned subject IDs for this form's academic context
    let facultySubjectIds = null;
    if (req.user.role === 'faculty') {
      const { rows: sfRows } = await query(
        `SELECT s.id FROM subjects s
         JOIN subject_faculty sf ON sf.subject_id = s.id
         JOIN forms f ON f.branch_id = s.branch_id AND f.semester = s.semester
         WHERE f.id = $1 AND sf.faculty_id = $2`,
        [formId, req.user.id]
      );
      facultySubjectIds = sfRows.map(r => r.id);
      if (facultySubjectIds.length === 0) {
        return next(createError(403, 'FORBIDDEN', 'You do not have access to this form'));
      }
    }

    const countRes = await query(
      'SELECT COUNT(*) FROM responses WHERE form_id = $1',
      [formId]
    );
    const total = Number(countRes.rows[0].count);

    const { rows: responses } = await query(
      `SELECT id, respondent_name, respondent_email, submitted_at
       FROM responses WHERE form_id = $1
       ORDER BY submitted_at DESC
       LIMIT $2 OFFSET $3`,
      [formId, Number(limit), offset]
    );

    // Build answers for each response
    for (const resp of responses) {
      const { rows: answers } = await query(
        `SELECT a.id, a.question_id, q.text AS question_text, q.type,
                a.text_value, a.numeric_value, a.date_value
         FROM answers a
         JOIN questions q ON q.id = a.question_id
         WHERE a.response_id = $1
         ORDER BY q.order_index`,
        [resp.id]
      );

      for (const ans of answers) {
        // Grid values — filtered to faculty's subjects if applicable
        if (ans.type === 'grid') {
          let gvQuery = `
            SELECT qr.label, agv.value, agv.subject_id
            FROM answer_grid_values agv
            JOIN question_rows qr ON qr.id = agv.question_row_id
            WHERE agv.answer_id = $1`;
          const gvParams = [ans.id];

          if (facultySubjectIds !== null) {
            gvParams.push(facultySubjectIds);
            gvQuery += ` AND agv.subject_id = ANY($2)`;
          }
          gvQuery += ' ORDER BY qr.order_index';

          const { rows: gvRows } = await query(gvQuery, gvParams);
          ans.grid_values = gvRows.map(r => ({ label: r.label, value: r.value }));
        } else {
          ans.grid_values = [];
        }

        // Selected options
        const { rows: optRows } = await query(
          `SELECT qo.label FROM answer_selected_options aso
           JOIN question_options qo ON qo.id = aso.option_id
           WHERE aso.answer_id = $1`,
          [ans.id]
        );
        ans.selected_options = optRows.map(r => r.label);

        // Coerce NUMERIC columns to JS numbers
        if (ans.numeric_value !== null && ans.numeric_value !== undefined) {
          ans.numeric_value = Number(ans.numeric_value);
        }

        // Clean up internal fields
        delete ans.id;
      }

      resp.answers = answers;
    }

    res.json({ total, data: responses });
  } catch (err) {
    next(err);
  }
}
