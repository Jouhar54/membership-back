import express from 'express';
import { createBatch, getBatches, getBatchById, updateBatch, deleteBatch } from '../controllers/batch.controller.js';
import { protect } from '../middlewares/auth.middleware.js';
import { authorize } from '../middlewares/role.middleware.js';
import { validate, batchValidation } from '../utils/validators.js';

const router = express.Router();

// Only admin can manage batches
router.use(protect);
router.use(authorize('admin'));

router.route('/')
  .post(batchValidation, validate, createBatch)
  .get(getBatches);

router.route('/:id')
  .get(getBatchById)
  .patch(batchValidation, validate, updateBatch)
  .delete(deleteBatch);

export default router;
