const express = require('express');
const { getStats, getPendingMemberships, getBatchStats } = require('../controllers/dashboard.controller');
const { protect } = require('../middlewares/auth.middleware');
const { authorize } = require('../middlewares/role.middleware');

const router = express.Router();

router.use(protect);
router.use(authorize('admin', 'batch_admin'));

router.get('/stats', getStats);
router.get('/pending-memberships', getPendingMemberships);
router.get('/batch-stats', getBatchStats);

module.exports = router;
