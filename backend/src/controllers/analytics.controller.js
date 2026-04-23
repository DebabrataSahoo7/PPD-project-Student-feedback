import { query, getClient } from '../db/pool.js';
import { createError } from '../middleware/errorHandler.js';
import { notify } from '../utils/notify.js';

async function getFacultySubjectIdsForForm(formId, facultyId) {
  const { rows } = await query(
    `SELECT s.id
     FROM subjects s
     JOIN subject_faculty sf ON sf.subject_id = s.id
     JOIN forms f ON f.branch_id = s.branch_id AND f.semester = s.semester
     WHERE f.id = $1 AND sf.faculty_id = $2`,
    [formId, facultyId]
  );
  return rows.map((row) => row.id);
}

// ── GET /forms/:id/analytics ──────────────────────────────────
export async function getAnalytics(req, res, next) {
  try {
    const { id: formId } = req.params;

    const formCheck = await query('SELECT id, mode FROM forms WHERE id = $1', [formId]);
    if (formCheck.rowCount === 0) return next(createError(404, 'FORM_NOT_FOUND', 'Form not found'));
    const formMode = formCheck.rows[0].mode;

    let facultySubjectIds = null;
    if (req.user.role === 'faculty') {
      facultySubjectIds = await getFacultySubjectIdsForForm(formId, req.user.id);
      if (facultySubjectIds.length === 0) {
        return next(createError(403, 'FORBIDDEN', 'You do not have access to this form'));
      }
    }

    const { rows: [{ total_responses }] } = await query(
      'SELECT COUNT(*)::int AS total_responses FROM responses WHERE form_id = $1',
      [formId]
    );

    const { rows: [{ invite_count }] } = await query(
      'SELECT COUNT(*)::int AS invite_count FROM email_invites WHERE form_id = $1',
      [formId]
    );

    const response_rate = invite_count > 0
      ? Math.round((total_responses / invite_count) * 1000) / 10
      : 0;

    // Questions
    const { rows: questions } = await query(
      `SELECT id, text, type, order_index FROM questions WHERE form_id = $1 ORDER BY order_index`,
      [formId]
    );

    const questionData = [];
    for (const q of questions) {
      const qObj = { question_id: q.id, question_text: q.text, type: q.type };

      if (q.type === 'grid') {
        // Per-row avg, percentage, distribution
        const rowParams = [q.id];
        let rowFilter = '';
        if (facultySubjectIds) {
          rowParams.push(facultySubjectIds);
          rowFilter = ` AND qr.subject_id = ANY($2)`;
        }

        const { rows: rowStats } = await query(
          `SELECT
             qr.id AS row_id, qr.label, qr.subject_id,
             ROUND(AVG(agv.value)::numeric, 2)  AS avg,
             ROUND((AVG(agv.value) / 5.0 * 100)::numeric, 2) AS percentage,
             COUNT(agv.value)::int AS total_count
           FROM question_rows qr
           LEFT JOIN answer_grid_values agv ON agv.question_row_id = qr.id
           WHERE qr.question_id = $1
             ${rowFilter}
           GROUP BY qr.id, qr.label, qr.subject_id
           ORDER BY qr.order_index`,
          rowParams
        );

        for (const row of rowStats) {
          // Distribution 1–5
          const { rows: dist } = await query(
            `SELECT value, COUNT(*)::int AS cnt
             FROM answer_grid_values
             WHERE question_row_id = $1
             GROUP BY value`,
            [row.row_id]
          );
          const distribution = { '1': 0, '2': 0, '3': 0, '4': 0, '5': 0 };
          for (const d of dist) distribution[String(d.value)] = d.cnt;
          row.distribution = distribution;
          delete row.row_id;
          delete row.total_count;
        }
        qObj.rows = rowStats;
      } else if (['rating', 'linear_scale'].includes(q.type)) {
        const { rows: [stat] } = await query(
          `SELECT ROUND(AVG(numeric_value)::numeric, 2) AS avg,
                  ROUND((AVG(numeric_value) / 5.0 * 100)::numeric, 2) AS percentage
           FROM answers WHERE question_id = $1`,
          [q.id]
        );
        qObj.avg        = stat?.avg        ?? null;
        qObj.percentage = stat?.percentage ?? null;
      } else if (['short_text', 'long_text'].includes(q.type)) {
        const { rows: texts } = await query(
          `SELECT text_value FROM answers WHERE question_id = $1 AND text_value IS NOT NULL`,
          [q.id]
        );
        qObj.text_responses = texts.map(t => t.text_value);
      } else if (['mcq', 'checkbox', 'dropdown'].includes(q.type)) {
        const { rows: optStats } = await query(
          `SELECT qo.label, COUNT(aso.id)::int AS count
           FROM question_options qo
           LEFT JOIN answer_selected_options aso ON aso.option_id = qo.id
           WHERE qo.question_id = $1
           GROUP BY qo.id, qo.label ORDER BY qo.order_index`,
          [q.id]
        );
        qObj.option_counts = optStats;
      }

      questionData.push(qObj);
    }

    res.json({ form_id: formId, form_mode: formMode, total_responses, invite_count, response_rate, questions: questionData });
  } catch (err) {
    next(err);
  }
}

// ── POST /forms/:id/analytics/co/compute ─────────────────────
export async function computeCOAttainment(req, res, next) {
  const { id: formId } = req.params;
  const client = await getClient();

  try {
    await client.query('BEGIN');

    const formCheck = await client.query(
      `SELECT id, branch_id, semester FROM forms WHERE id = $1 AND mode = 'academic'`,
      [formId]
    );
    if (formCheck.rowCount === 0) {
      await client.query('ROLLBACK');
      return next(createError(400, 'CO_ANALYTICS_NOT_AVAILABLE', 'CO analytics are only available for Academic CO forms'));
    }

    const { branch_id, semester } = formCheck.rows[0];

    // Get all subjects for this branch and semester
    const { rows: subjects } = await client.query(
      'SELECT id FROM subjects WHERE branch_id = $1 AND semester = $2',
      [branch_id, semester]
    );

    const computedAt = new Date();

    for (const subj of subjects) {
      // Get all dimension→CO mappings for this subject
      const { rows: mappings } = await client.query(
        `SELECT dcm.dimension, dcm.co_id
         FROM dimension_co_map dcm WHERE dcm.subject_id = $1`,
        [subj.id]
      );

      // Group co_id → [dimensions]
      const coMap = {};
      for (const m of mappings) {
        if (!coMap[m.co_id]) coMap[m.co_id] = [];
        coMap[m.co_id].push(m.dimension);
      }

      for (const [coId, dimensions] of Object.entries(coMap)) {
        // Flat pool: ALL individual ratings from ALL contributing dimensions for this subject
        const { rows: vals } = await client.query(
          `SELECT agv.value
           FROM answer_grid_values agv
           JOIN question_rows qr ON qr.id = agv.question_row_id
           JOIN questions q ON q.id = qr.question_id
           WHERE q.form_id = $1
             AND agv.subject_id = $2
             AND q.type = 'grid'
             AND q.dimension = ANY($3::teaching_dimension[])`,
          [formId, subj.id, dimensions]
        );

        if (vals.length === 0) continue;

        const sum      = vals.reduce((acc, r) => acc + Number(r.value), 0);
        const avg      = sum / vals.length;
        const pct      = (avg / 5) * 100;
        const level    = pct >= 80 ? 'level_3' : pct >= 70 ? 'level_2' : pct >= 60 ? 'level_1' : 'not_met';
        const respCount = vals.length;

        await client.query(
          `INSERT INTO co_attainment_results
             (form_id, co_id, subject_id, avg_score, percentage, level, response_count, computed_at)
           VALUES ($1,$2,$3,$4,$5,$6,$7,$8)
           ON CONFLICT (form_id, co_id) DO UPDATE
             SET avg_score      = EXCLUDED.avg_score,
                 percentage     = EXCLUDED.percentage,
                 level          = EXCLUDED.level,
                 response_count = EXCLUDED.response_count,
                 computed_at    = EXCLUDED.computed_at`,
          [formId, coId, subj.id,
           Math.round(avg * 100) / 100,
           Math.round(pct * 100) / 100,
           level, respCount, computedAt]
        );
      }
    }

    await client.query('COMMIT');

    // Notify creator + assigned faculty that CO results are ready
    const formMeta = await query(
      `SELECT f.title, f.creator_id, f.branch_id, f.semester FROM forms f WHERE f.id = $1`,
      [formId]
    );
    if (formMeta.rowCount) {
      const { title, creator_id, branch_id, semester } = formMeta.rows[0];
      const link = `/admin/forms/${formId}/analytics`;

      await notify({ query }, creator_id, `CO attainment computed for "${title}". Results are ready.`, link);

      if (branch_id && semester) {
        const { rows: faculty } = await query(
          `SELECT DISTINCT sf.faculty_id FROM subject_faculty sf
           JOIN subjects s ON s.id = sf.subject_id
           WHERE s.branch_id = $1 AND s.semester = $2 AND sf.faculty_id != $3`,
          [branch_id, semester, creator_id]
        );
        for (const f of faculty) {
          await notify({ query }, f.faculty_id, `CO attainment results are ready for "${title}".`, null);
        }
      }
    }

    res.json({ message: 'CO attainment computed', computed_at: computedAt.toISOString() });
  } catch (err) {
    await client.query('ROLLBACK');
    next(err);
  } finally {
    client.release();
  }
}

// ── GET /forms/:id/analytics/co ───────────────────────────────
export async function getCOAnalytics(req, res, next) {
  try {
    const { id: formId } = req.params;

    const formCheck = await query('SELECT id, mode FROM forms WHERE id = $1', [formId]);
    if (formCheck.rowCount === 0) return next(createError(404, 'FORM_NOT_FOUND', 'Form not found'));
    if (formCheck.rows[0].mode !== 'academic') {
      return next(createError(400, 'CO_ANALYTICS_NOT_AVAILABLE', 'CO analytics are only available for Academic CO forms'));
    }

    let facultySubjectIds = null;
    if (req.user.role === 'faculty') {
      facultySubjectIds = await getFacultySubjectIdsForForm(formId, req.user.id);
      if (facultySubjectIds.length === 0) {
        return next(createError(403, 'FORBIDDEN', 'You do not have access to this form'));
      }
    }

    const resultParams = [formId];
    let resultFilter = '';
    if (facultySubjectIds) {
      resultParams.push(facultySubjectIds);
      resultFilter = ' AND car.subject_id = ANY($2)';
    }

    const { rows: results } = await query(
      `SELECT car.co_id, car.subject_id, car.avg_score, car.percentage, car.level, car.response_count,
              co.co_code, co.description, s.name AS subject_name, s.short_code
       FROM co_attainment_results car
       JOIN course_outcomes co ON co.id = car.co_id
       JOIN subjects s ON s.id = car.subject_id
       WHERE car.form_id = $1
         ${resultFilter}
       ORDER BY s.order_index, co.order_index`,
      resultParams
    );

    if (results.length === 0) {
      return next(createError(404, 'COMPUTE_NOT_RUN', 'CO attainment has not been computed yet. Run POST /analytics/co/compute first.'));
    }

    const { rows: [{ total_responses }] } = await query(
      'SELECT COUNT(*)::int AS total_responses FROM responses WHERE form_id = $1',
      [formId]
    );

    // Group by subject
    const subjectMap = {};
    for (const r of results) {
      if (!subjectMap[r.subject_id]) {
        subjectMap[r.subject_id] = {
          subject_id:   r.subject_id,
          subject_name: r.subject_name,
          short_code:   r.short_code,
          co_attainment: [],
        };
      }

      // Contributing dimensions for this CO
      const { rows: dims } = await query(
        `SELECT DISTINCT dimension FROM dimension_co_map
         WHERE co_id = $1 AND subject_id = $2`,
        [r.co_id, r.subject_id]
      );

      subjectMap[r.subject_id].co_attainment.push({
        co_id:                   r.co_id,
        co_code:                 r.co_code,
        description:             r.description,
        avg_score:               Number(r.avg_score),
        percentage:              Number(r.percentage),
        level:                   r.level,
        contributing_dimensions: dims.map(d => d.dimension),
      });
    }

    // Dimension breakdown per subject
    const subjects = [];
    for (const subj of Object.values(subjectMap)) {
      const { rows: dimBreakdown } = await query(
        `SELECT q.dimension,
                ROUND(AVG(agv.value)::numeric, 2) AS avg,
                ROUND((AVG(agv.value) / 5.0 * 100)::numeric, 2) AS percentage,
                COUNT(DISTINCT q.id)::int AS question_count
         FROM answer_grid_values agv
         JOIN question_rows qr ON qr.id = agv.question_row_id
         JOIN questions q ON q.id = qr.question_id
         WHERE q.form_id = $1
           AND agv.subject_id = $2
           AND q.type = 'grid'
           AND q.dimension IS NOT NULL
         GROUP BY q.dimension`,
        [formId, subj.subject_id]
      );

      const pcts = subj.co_attainment.map(c => c.percentage);
      const overall_percentage = pcts.length
        ? Math.round(pcts.reduce((a, b) => a + b, 0) / pcts.length * 100) / 100
        : 0;
      const overall_level = overall_percentage >= 80 ? 'level_3'
        : overall_percentage >= 70 ? 'level_2'
        : overall_percentage >= 60 ? 'level_1' : 'not_met';
      const status = overall_percentage >= 80 ? 'strong'
        : overall_percentage >= 60 ? 'average' : 'weak';

      subjects.push({
        ...subj,
        dimension_breakdown: dimBreakdown,
        overall_percentage,
        overall_level,
        status,
      });
    }

    // Insights
    const insights = [];
    for (const s of subjects) {
      if (s.status === 'weak') {
        insights.push({ type: 'weak', subject: s.subject_name, message: `${s.subject_name} has low CO attainment (${s.overall_percentage}%). Focus on weak dimensions.` });
      } else if (s.status === 'strong') {
        insights.push({ type: 'strong', subject: s.subject_name, message: `${s.subject_name} shows strong CO attainment (${s.overall_percentage}%).` });
      }
    }

    res.json({ form_id: formId, total_responses, subjects, insights });
  } catch (err) {
    next(err);
  }
}
