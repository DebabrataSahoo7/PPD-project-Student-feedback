/**
 * Zod validation middleware factory.
 * Usage: validate(myZodSchema)
 */
export function validate(schema) {
  return (req, _res, next) => {
    const result = schema.safeParse(req.body);
    if (!result.success) {
      const err = new Error('Validation failed');
      err.name      = 'ZodError';
      err.issues    = result.error.issues; // Zod v4 uses .issues
      return next(err);
    }
    req.body = result.data;
    next();
  };
}
