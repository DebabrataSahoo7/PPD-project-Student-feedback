/**
 * Global error handler — returns the exact error JSON format from api_endpoints.md
 */
export function errorHandler(err, _req, res, _next) {
  const status = err.status || err.statusCode || 500;
  const code   = err.code   || 'INTERNAL_SERVER_ERROR';
  const message = err.message || 'An unexpected error occurred';

  // Zod validation errors (v4 uses .issues, v3 uses .errors)
  if (err.name === 'ZodError') {
    const issues = err.issues || err.errors || [];
    return res.status(400).json({
      error: true,
      code: 'VALIDATION_ERROR',
      message: issues.map((e) => `${e.path.join('.')}: ${e.message}`).join('; '),
    });
  }

  res.status(status).json({ error: true, code, message });
}

/**
 * Convenience factory for creating structured API errors.
 * Usage: throw createError(404, 'FORM_NOT_FOUND', 'Form not found')
 */
export function createError(status, code, message) {
  const err = new Error(message);
  err.status = status;
  err.code   = code;
  return err;
}
