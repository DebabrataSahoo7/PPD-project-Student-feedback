import { query } from '../db/pool.js';
import { createError } from '../middleware/errorHandler.js';

// ── GET /notifications ────────────────────────────────────────
export async function listNotifications(req, res, next) {
  try {
    const { unread } = req.query;
    const params = [req.user.id];
    let where = 'WHERE user_id = $1';

    if (unread === 'true') {
      where += ' AND is_read = false';
    }

    const { rows } = await query(
      `SELECT id, message, link, is_read, created_at
       FROM notifications ${where}
       ORDER BY created_at DESC`,
      params
    );

    const { rows: [{ count }] } = await query(
      'SELECT COUNT(*)::int AS count FROM notifications WHERE user_id = $1 AND is_read = false',
      [req.user.id]
    );

    res.json({ data: rows, unread_count: count });
  } catch (err) {
    next(err);
  }
}

// ── PATCH /notifications/:id/read ────────────────────────────
export async function markRead(req, res, next) {
  try {
    const { id } = req.params;
    const { rows } = await query(
      `UPDATE notifications SET is_read = true
       WHERE id = $1 AND user_id = $2
       RETURNING id, is_read`,
      [id, req.user.id]
    );
    if (rows.length === 0) return next(createError(404, 'NOT_FOUND', 'Notification not found'));
    res.json(rows[0]);
  } catch (err) {
    next(err);
  }
}

// ── PATCH /notifications/read-all ────────────────────────────
export async function markAllRead(req, res, next) {
  try {
    await query(
      'UPDATE notifications SET is_read = true WHERE user_id = $1',
      [req.user.id]
    );
    res.json({ message: 'All notifications marked as read' });
  } catch (err) {
    next(err);
  }
}
