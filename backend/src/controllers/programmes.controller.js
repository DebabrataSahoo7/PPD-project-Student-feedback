import pool from '../db/pool.js';

export const getProgrammes = async (req, res, next) => {
  try {
    const result = await pool.query('SELECT id, name, created_at FROM programmes ORDER BY name ASC');
    res.json({ data: result.rows });
  } catch (error) {
    next(error);
  }
};

export const createProgramme = async (req, res, next) => {
  try {
    const { name } = req.body;
    const result = await pool.query(
      'INSERT INTO programmes (name) VALUES ($1) RETURNING id, name, created_at',
      [name]
    );
    res.status(201).json(result.rows[0]);
  } catch (error) {
    if (error.code === '23505') { // unique violation
      return res.status(400).json({ error: true, code: 'VALIDATION_ERROR', message: 'Programme already exists' });
    }
    next(error);
  }
};

export const getProgrammeBranches = async (req, res, next) => {
  try {
    const { id } = req.params;
    const result = await pool.query(
      'SELECT id, name, programme_id, created_at FROM branches WHERE programme_id = $1 ORDER BY name ASC',
      [id]
    );
    res.json({ data: result.rows });
  } catch (error) {
    next(error);
  }
};
