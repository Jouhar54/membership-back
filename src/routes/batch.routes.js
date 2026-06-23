const express = require('express');
const { createBatch, getBatches, getBatchById, updateBatch, deleteBatch } = require('../controllers/batch.controller');
const { protect } = require('../middlewares/auth.middleware');
const { authorize } = require('../middlewares/role.middleware');
const { validate, batchValidation } = require('../utils/validators');

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

module.exports = router;
