import { Router } from 'express';
import { authenticate } from '../middleware/authenticate.js';
import { authorize }    from '../middleware/authorize.js';
import { getAnalytics, computeCOAttainment, getCOAnalytics } from '../controllers/analytics.controller.js';
import { exportCSV, exportPDF } from '../controllers/exports.controller.js';
import { sendInvites, sendReminders, listInvites } from '../controllers/invites.controller.js';
import { validate } from '../middleware/validate.js';
import { sendInvitesSchema } from '../validators/invites.validator.js';

const router = Router();

// ── Analytics ─────────────────────────────────────────────────
router.get('/:id/analytics',            authenticate, authorize('admin','faculty'), getAnalytics);
router.get('/:id/analytics/co',         authenticate, authorize('admin','faculty'), getCOAnalytics);
router.post('/:id/analytics/co/compute',authenticate, authorize('admin'),           computeCOAttainment);

// ── Exports ───────────────────────────────────────────────────
router.get('/:id/export/csv', authenticate, authorize('admin','faculty'), exportCSV);
router.get('/:id/export/pdf', authenticate, authorize('admin','faculty'), exportPDF);

// ── Email Invites ─────────────────────────────────────────────
router.post('/:id/invites',        authenticate, authorize('admin'), validate(sendInvitesSchema), sendInvites);
router.post('/:id/invites/remind', authenticate, authorize('admin'), sendReminders);
router.get('/:id/invites',         authenticate, authorize('admin'), listInvites);

export default router;
