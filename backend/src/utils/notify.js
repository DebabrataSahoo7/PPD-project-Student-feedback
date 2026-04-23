import { query } from '../db/pool.js';

/**
 * Insert an in-app notification for a user.
 *
 * @param {object} db   - A pg client or the pool's query function.
 *                        Pass `{ query }` from pool for pool queries,
 *                        or a transaction client directly.
 * @param {string} userId
 * @param {string} message
 * @param {string|null} link  - Optional deep-link path (e.g. '/admin/forms/:id/analytics')
 */
export async function notify(db, userId, message, link = null) {
  const q = typeof db.query === 'function' ? db.query.bind(db) : query;
  await q(
    `INSERT INTO notifications (user_id, message, link)
     VALUES ($1, $2, $3)`,
    [userId, message, link]
  );
}
