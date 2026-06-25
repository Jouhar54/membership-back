import express from 'express';
import { createBatch, getBatches, getBatchById, updateBatch, deleteBatch } from '../controllers/batch.controller.js';
import { protect } from '../middlewares/auth.middleware.js';
import { authorize } from '../middlewares/role.middleware.js';
import { validate, batchValidation } from '../utils/validators.js';

const router = express.Router();

// Public routes
router.get('/', getBatches);

// Protected routes
router.use(protect);

router.post('/', authorize('admin'), batchValidation, validate, createBatch);

router.route('/:id')
  .get(authorize('admin', 'batch_admin'), getBatchById)
  .patch(authorize('admin'), batchValidation, validate, updateBatch)
  .delete(authorize('admin'), deleteBatch);

export default router;
