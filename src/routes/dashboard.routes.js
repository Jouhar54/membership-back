import express from 'express';
import { getStats, getPendingMemberships, getBatchStats } from '../controllers/dashboard.controller.js';
import { protect } from '../middlewares/auth.middleware.js';
import { authorize } from '../middlewares/role.middleware.js';

const router = express.Router();

router.use(protect);
router.use(authorize('admin', 'batch_admin'));

router.get('/stats', getStats);
router.get('/pending-memberships', getPendingMemberships);
router.get('/batch-stats', getBatchStats);

export default router;
