import jwt from 'jsonwebtoken';
import { createError } from './errorHandler.js';

/**
 * Verifies the Bearer JWT and attaches `req.user = { id, role, email }`
 * Throws 401 if token is missing/invalid, 403 if user is inactive.
 */
export function authenticate(req, _res, next) {
  const header = req.headers.authorization;
  if (!header || !header.startsWith('Bearer ')) {
    return next(createError(401, 'UNAUTHORIZED', 'Authentication token required'));
  }

  const token = header.slice(7);
  try {
    const payload = jwt.verify(token, process.env.JWT_SECRET);
    req.user = payload; // { id, role, email, is_active }
    if (payload.is_active === false) {
      return next(createError(403, 'USER_INACTIVE', 'This account has been deactivated'));
    }
    next();
  } catch {
    next(createError(401, 'UNAUTHORIZED', 'Invalid or expired token'));
  }
}
