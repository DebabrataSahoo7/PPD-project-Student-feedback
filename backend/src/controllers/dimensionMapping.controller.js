import { getClient } from '../db/pool.js';
import { query }     from '../db/pool.js';
import { createError } from '../middleware/errorHandler.js';

// ── POST /subjects/:subjectId/dimension-mapping ───────────────
// Replaces ALL existing mappings for the subject in a single transaction.
export async function setDimensionMapping(req, res, next) {
  const { subjectId } = req.params;
  const { mappings }  = req.body;

  const client = await getClient();
  try {
    await client.query('BEGIN');

    const seenMappings = new Set();
    for (const m of mappings) {
      const key = `${m.dimension}:${m.co_id}`;
      if (seenMappings.has(key)) {
        await client.query('ROLLBACK');
        return next(createError(400, 'VALIDATION_ERROR', 'Duplicate dimension-to-CO mappings are not allowed for the same subject'));
      }
      seenMappings.add(key);
    }

    // Verify subject exists
    const subj = await client.query('SELECT id FROM subjects WHERE id = $1', [subjectId]);
    if (subj.rowCount === 0) {
      await client.query('ROLLBACK');
      return next(createError(404, 'SUBJECT_NOT_FOUND', 'Subject not found'));
    }

    // Verify all co_ids belong to this subject
    for (const m of mappings) {
      const co = await client.query(
        'SELECT id FROM course_outcomes WHERE id = $1 AND subject_id = $2',
        [m.co_id, subjectId]
      );
      if (co.rowCount === 0) {
        await client.query('ROLLBACK');
        return next(createError(400, 'INVALID_CO', `CO ${m.co_id} does not belong to this subject`));
      }
    }

    // Delete existing mappings for this subject
    await client.query('DELETE FROM dimension_co_map WHERE subject_id = $1', [subjectId]);

    // Insert new mappings
    for (const m of mappings) {
      await client.query(
        `INSERT INTO dimension_co_map (subject_id, dimension, co_id) VALUES ($1, $2, $3)`,
        [subjectId, m.dimension, m.co_id]
      );
    }

    await client.query('COMMIT');
    res.status(201).json({ subject_id: subjectId, mappings_created: mappings.length });
  } catch (err) {
    await client.query('ROLLBACK');
    if (err.code === '23505') {
      return next(createError(400, 'VALIDATION_ERROR', 'Duplicate dimension-to-CO mappings are not allowed for the same subject'));
    }
    next(err);
  } finally {
    client.release();
  }
}

// ── GET /subjects/:subjectId/dimension-mapping ────────────────
export async function getDimensionMapping(req, res, next) {
  try {
    const { subjectId } = req.params;

    const subj = await query('SELECT id FROM subjects WHERE id = $1', [subjectId]);
    if (subj.rowCount === 0) return next(createError(404, 'SUBJECT_NOT_FOUND', 'Subject not found'));

    const { rows } = await query(
      `SELECT dcm.id, dcm.dimension, dcm.co_id,
              co.co_code, co.description AS co_description
       FROM dimension_co_map dcm
       JOIN course_outcomes co ON co.id = dcm.co_id
       WHERE dcm.subject_id = $1
       ORDER BY dcm.dimension, co.co_code`,
      [subjectId]
    );

    res.json({ subject_id: subjectId, mappings: rows });
  } catch (err) {
    next(err);
  }
}
