const express = require('express');
const { register, getMyMemberships, getMembershipById, getMembershipsByBatch, markAsPaid, approveMembership, rejectMembership } = require('../controllers/membership.controller');
const { protect } = require('../middlewares/auth.middleware');
const { authorize } = require('../middlewares/role.middleware');

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

module.exports = router;
