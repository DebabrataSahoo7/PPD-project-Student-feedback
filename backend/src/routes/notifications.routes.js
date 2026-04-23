import { Router } from 'express';
import { authenticate } from '../middleware/authenticate.js';
import { authorize }    from '../middleware/authorize.js';
import { listNotifications, markRead, markAllRead } from '../controllers/notifications.controller.js';

const router = Router();

router.use(authenticate, authorize('admin', 'faculty', 'student'));

router.get('/',              listNotifications);
router.patch('/read-all',    markAllRead);
router.patch('/:id/read',    markRead);

export default router;
