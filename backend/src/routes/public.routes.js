import { Router } from 'express';
import { validate }      from '../middleware/validate.js';
import { submitResponseSchema } from '../validators/responses.validator.js';
import { getPublicForm, submitResponse } from '../controllers/publicForms.controller.js';

// Optional auth — attach req.user if token present, but don't block if absent
import jwt from 'jsonwebtoken';

function optionalAuth(req, _res, next) {
  const header = req.headers.authorization;
  if (header?.startsWith('Bearer ')) {
    try {
      req.user = jwt.verify(header.slice(7), process.env.JWT_SECRET);
    } catch {
      // invalid token — treat as unauthenticated
    }
  }
  next();
}

const router = Router();

router.get('/:shareToken',           optionalAuth, getPublicForm);
router.post('/:shareToken/responses', optionalAuth, validate(submitResponseSchema), submitResponse);

export default router;
