import { Router } from 'express';
import { authenticate } from '../middleware/authenticate.js';
import { authorize }    from '../middleware/authorize.js';
import { validate }     from '../middleware/validate.js';
import { updateQuestionSchema } from '../validators/forms.validator.js';
import { updateQuestion, deleteQuestion } from '../controllers/questions.controller.js';

const router = Router();

router.put('/:id',    authenticate, authorize('admin'), validate(updateQuestionSchema), updateQuestion);
router.delete('/:id', authenticate, authorize('admin'), deleteQuestion);

export default router;
