import { Router } from 'express';
import { authenticate }    from '../middleware/authenticate.js';
import { authorize }       from '../middleware/authorize.js';
import { validate }        from '../middleware/validate.js';
import { registerSchema, loginSchema, changePasswordSchema } from '../validators/auth.validator.js';
import { register, login, changePassword, getMe } from '../controllers/auth.controller.js';

const router = Router();

// POST /auth/register  — Admin only
router.post('/register',
  authenticate,
  authorize('admin'),
  validate(registerSchema),
  register
);

// POST /auth/login  — Public
router.post('/login', validate(loginSchema), login);

// PATCH /auth/change-password  — A, F, S
router.patch('/change-password',
  authenticate,
  authorize('admin', 'faculty', 'student'),
  validate(changePasswordSchema),
  changePassword
);

// GET /auth/me  — A, F, S
router.get('/me',
  authenticate,
  authorize('admin', 'faculty', 'student'),
  getMe
);

export default router;
