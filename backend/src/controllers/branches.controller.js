import pool from '../db/pool.js';

export const createBranch = async (req, res, next) => {
  try {
    const { programme_id, name } = req.body;
    
    // Check if programme exists
    const progRes = await pool.query('SELECT id FROM programmes WHERE id = $1', [programme_id]);
    if (progRes.rows.length === 0) {
      return res.status(404).json({ error: true, code: 'PROGRAMME_NOT_FOUND', message: 'Programme not found' });
    }

    const result = await pool.query(
      'INSERT INTO branches (programme_id, name) VALUES ($1, $2) RETURNING id, programme_id, name, created_at',
      [programme_id, name]
    );
    res.status(201).json(result.rows[0]);
  } catch (error) {
    if (error.code === '23505') {
       return res.status(400).json({ error: true, code: 'VALIDATION_ERROR', message: 'Branch already exists under this programme' });
    }
    next(error);
  }
};

export const getBranchSubjects = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { semester } = req.query;
    
    let query = 'SELECT id, name, short_code, order_index, created_at FROM subjects WHERE branch_id = $1';
    const params = [id];
    
    if (semester) {
      params.push(parseInt(semester, 10));
      query += ` AND semester = $2`;
    }

    if (req.user.role === 'faculty') {
      params.push(req.user.id);
      query += ` AND id IN (
        SELECT subject_id
        FROM subject_faculty
        WHERE faculty_id = ${params.length}
      )`;
    }
    
    query += ' ORDER BY order_index ASC, name ASC';
    
    const result = await pool.query(query, params);
    
    const subjects = [];
    for (const sub of result.rows) {
      const coRes = await pool.query('SELECT COUNT(*) FROM course_outcomes WHERE subject_id = $1', [sub.id]);
      const facRes = await pool.query(
         `SELECT u.id, u.name FROM users u JOIN subject_faculty sf ON u.id = sf.faculty_id WHERE sf.subject_id = $1`,
         [sub.id]
      );
      subjects.push({
        ...sub,
        co_count: parseInt(coRes.rows[0].count, 10),
        faculty: facRes.rows
      });
    }
    
    res.json({ data: subjects });
  } catch (error) {
    next(error);
  }
};
