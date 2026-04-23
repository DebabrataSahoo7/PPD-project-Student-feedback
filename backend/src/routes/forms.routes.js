import { Router } from 'express';
import { authenticate } from '../middleware/authenticate.js';
import { authorize }    from '../middleware/authorize.js';
import { validate }     from '../middleware/validate.js';
import { createFormSchema, updateFormSchema, createQuestionSchema, updateQuestionSchema, reorderQuestionsSchema, dimensionMappingSchema } from '../validators/forms.validator.js';
import { createForm, listForms, getForm, updateForm, publishForm, closeForm, deleteForm } from '../controllers/forms.controller.js';
import { createQuestion, updateQuestion, deleteQuestion, reorderQuestions } from '../controllers/questions.controller.js';
import { setDimensionMapping, getDimensionMapping } from '../controllers/dimensionMapping.controller.js';
import { listResponses } from '../controllers/responses.controller.js';
import { applyTemplate } from '../controllers/templates.controller.js';

const router = Router();

// ── Forms ─────────────────────────────────────────────────────
router.post('/',    authenticate, authorize('admin'),           validate(createFormSchema), createForm);
router.get('/',     authenticate, authorize('admin','faculty','student'), listForms);
router.get('/:id',  authenticate, authorize('admin','faculty'), getForm);
router.put('/:id',  authenticate, authorize('admin'),           validate(updateFormSchema), updateForm);
router.delete('/:id', authenticate, authorize('admin'),         deleteForm);

router.post('/:id/publish',        authenticate, authorize('admin'), publishForm);
router.post('/:id/close',          authenticate, authorize('admin'), closeForm);
router.post('/:id/apply-template', authenticate, authorize('admin'), applyTemplate);

// ── Questions (nested under forms) ───────────────────────────
router.post('/:formId/questions',          authenticate, authorize('admin'), validate(createQuestionSchema), createQuestion);
router.patch('/:formId/questions/reorder', authenticate, authorize('admin'), validate(reorderQuestionsSchema), reorderQuestions);

// ── Responses (nested under forms) ───────────────────────────
router.get('/:id/responses', authenticate, authorize('admin', 'faculty'), listResponses);

export default router;
