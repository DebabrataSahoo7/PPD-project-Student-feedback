import { Router } from 'express';
import { authenticate } from '../middleware/authenticate.js';
import { authorize } from '../middleware/authorize.js';
import { validate } from '../middleware/validate.js';
import { createBranchSchema } from '../validators/branches.validator.js';
import {
  createBranch,
  getBranchSubjects
} from '../controllers/branches.controller.js';

const router = Router();

router.use(authenticate);

router.post('/', authorize('admin'), validate(createBranchSchema), createBranch);
router.get('/:id/subjects', authorize('admin', 'faculty'), getBranchSubjects);

export default router;
