import { Router } from 'express';
import { authenticate } from '../middleware/authenticate.js';
import { authorize } from '../middleware/authorize.js';
import { validate } from '../middleware/validate.js';
import { createProgrammeSchema } from '../validators/programmes.validator.js';
import {
  getProgrammes,
  createProgramme,
  getProgrammeBranches
} from '../controllers/programmes.controller.js';

const router = Router();

router.use(authenticate);

router.get('/', authorize('admin', 'faculty'), getProgrammes);
router.post('/', authorize('admin'), validate(createProgrammeSchema), createProgramme);
router.get('/:id/branches', authorize('admin', 'faculty'), getProgrammeBranches);

export default router;
