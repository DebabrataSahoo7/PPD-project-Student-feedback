import { Router } from 'express';
import { authenticate } from '../middleware/authenticate.js';
import { authorize }    from '../middleware/authorize.js';
import { validate }     from '../middleware/validate.js';
import { updateCOSchema } from '../validators/subjects.validator.js';
import { updateCO, deleteCO } from '../controllers/cos.controller.js';

const router = Router();

router.put('/:id',    authenticate, authorize('admin'), validate(updateCOSchema), updateCO);
router.delete('/:id', authenticate, authorize('admin'), deleteCO);

export default router;
