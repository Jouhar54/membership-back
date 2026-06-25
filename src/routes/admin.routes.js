import express from 'express';
import * as adminController from '../controllers/admin.controller.js';
import * as applicationController from '../controllers/application.controller.js';
import { protect } from '../middlewares/auth.middleware.js';
import { authorize } from '../middlewares/role.middleware.js';
import { createBatchAdminValidation, updateBatchAdminValidation } from '../utils/admin.validator.js';

const router = express.Router();

// Apply protect middleware to all routes
router.use(protect);

// 1. Super Admin Only: Batch Admin Management
router.post('/create-batch-admin', authorize('admin'), createBatchAdminValidation, adminController.createBatchAdmin);
router.get('/batch-admins', authorize('admin'), adminController.getBatchAdmins);
router.get('/batch-admins/:id', authorize('admin'), adminController.getBatchAdminById);
router.patch('/batch-admins/:id', authorize('admin'), updateBatchAdminValidation, adminController.updateBatchAdmin);
router.delete('/batch-admins/:id', authorize('admin'), adminController.deleteBatchAdmin);

// 2. Admin & Batch Admin: Application Management
router.get('/applications/:batchId', authorize('admin', 'batch_admin'), applicationController.listBatchApplications);
router.patch('/applications/:id/mark-paid', authorize('admin', 'batch_admin'), applicationController.markPaid);
router.patch('/applications/:id/approve', authorize('admin', 'batch_admin'), applicationController.approve);
router.patch('/applications/:id/reject', authorize('admin', 'batch_admin'), applicationController.reject);

export default router;
