import { Router } from 'express';
import { authenticate } from '../middleware/authenticate.js';
import { authorize }    from '../middleware/authorize.js';
import { validate }     from '../middleware/validate.js';
import { createSubjectSchema, updateSubjectSchema, assignFacultySchema, createCOSchema } from '../validators/subjects.validator.js';
import { dimensionMappingSchema } from '../validators/forms.validator.js';
import { createSubject, updateSubject, deleteSubject, assignFaculty, unassignFaculty } from '../controllers/subjects.controller.js';
import { createCO, listCOs } from '../controllers/cos.controller.js';
import { setDimensionMapping, getDimensionMapping } from '../controllers/dimensionMapping.controller.js';

const router = Router();

router.post('/', authenticate, authorize('admin'), validate(createSubjectSchema), createSubject);
router.put('/:id',    authenticate, authorize('admin'), validate(updateSubjectSchema), updateSubject);
router.delete('/:id', authenticate, authorize('admin'), deleteSubject);

// ── Subject-Faculty assignment ────────────────────────────────
router.post('/:subjectId/faculty',              authenticate, authorize('admin'), validate(assignFacultySchema), assignFaculty);
router.delete('/:subjectId/faculty/:facultyId', authenticate, authorize('admin'), unassignFaculty);

// ── Course Outcomes (nested under subject) ────────────────────
router.post('/:subjectId/cos',  authenticate, authorize('admin'),           validate(createCOSchema), createCO);
router.get('/:subjectId/cos',   authenticate, authorize('admin', 'faculty'), listCOs);

// ── Dimension Mapping ─────────────────────────────────────────
router.post('/:subjectId/dimension-mapping', authenticate, authorize('admin'),           validate(dimensionMappingSchema), setDimensionMapping);
router.get('/:subjectId/dimension-mapping',  authenticate, authorize('admin', 'faculty'), getDimensionMapping);

export default router;
