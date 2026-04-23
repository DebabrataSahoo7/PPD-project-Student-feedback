import { Router } from 'express';
import { authenticate } from '../middleware/authenticate.js';
import { authorize }    from '../middleware/authorize.js';
import { validate }     from '../middleware/validate.js';
import { createFacultySchema, importUsersSchema, updateUserSchema } from '../validators/users.validator.js';
import { listUsers, importUsers, updateUser, createFaculty }  from '../controllers/users.controller.js';

const router = Router();

router.use(authenticate, authorize('admin'));

router.get('/',          listUsers);
router.post('/faculty',  validate(createFacultySchema), createFaculty);
router.post('/import',   validate(importUsersSchema), importUsers);
router.patch('/:id',     validate(updateUserSchema),  updateUser);

export default router;
