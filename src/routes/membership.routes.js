import express from 'express';
import { register, getMyMemberships, getMembershipById, getMembershipsByBatch, markAsPaid, approveMembership, rejectMembership } from '../controllers/membership.controller.js';
import { protect } from '../middlewares/auth.middleware.js';
import { authorize } from '../middlewares/role.middleware.js';

const router = express.Router();

router.use(protect);

router.post('/register', register);
router.get('/my', getMyMemberships);
router.get('/:id', getMembershipById);

// Admin and Batch Admin routes
router.get('/batch/:batchId', authorize('admin', 'batch_admin'), getMembershipsByBatch);
router.patch('/:id/mark-paid', authorize('admin', 'batch_admin'), markAsPaid);
router.patch('/:id/approve', authorize('admin', 'batch_admin'), approveMembership);
router.patch('/:id/reject', authorize('admin', 'batch_admin'), rejectMembership);

export default router;
