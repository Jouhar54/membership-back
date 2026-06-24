import express from 'express';
import * as adminController from '../controllers/admin.controller.js';
import { protect } from '../middlewares/auth.middleware.js';
import { authorize } from '../middlewares/role.middleware.js';
import { createBatchAdminValidation, updateBatchAdminValidation } from '../utils/admin.validator.js';

const router = express.Router();

// All routes here are protected and restricted to super admins
router.use(protect);
router.use(authorize('admin'));

router.post('/create-batch-admin', createBatchAdminValidation, adminController.createBatchAdmin);
router.get('/batch-admins', adminController.getBatchAdmins);
router.get('/batch-admins/:id', adminController.getBatchAdminById);
router.patch('/batch-admins/:id', updateBatchAdminValidation, adminController.updateBatchAdmin);
router.delete('/batch-admins/:id', adminController.deleteBatchAdmin);

export default router;
