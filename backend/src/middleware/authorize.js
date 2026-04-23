import { createError } from './errorHandler.js';

/**
 * Role-based access control middleware factory.
 * Usage: authorize('admin')  or  authorize('admin', 'faculty')
 *
 * Must be used AFTER authenticate().
 */
export function authorize(...roles) {
  return (req, _res, next) => {
    if (!req.user) {
      return next(createError(401, 'UNAUTHORIZED', 'Authentication required'));
    }
    if (!roles.includes(req.user.role)) {
      return next(createError(403, 'FORBIDDEN', 'You do not have permission to perform this action'));
    }
    next();
  };
}
