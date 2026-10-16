import MembershipApplication from '../models/MembershipApplication.js';
import Batch from '../models/Batch.js';
import User from '../models/User.js';
import { successResponse } from '../utils/response.js';

const getStats = async (req, res, next) => {
  try {
    const isBatchAdmin = req.user && req.user.role === 'batch_admin' && req.user.batch;
    const filter = isBatchAdmin ? { batch: req.user.batch } : {};

    const totalMemberships = await MembershipApplication.countDocuments(filter);
    const approvedMemberships = await MembershipApplication.countDocuments({ ...filter, membershipStatus: 'approved' });
    const pendingMemberships = await MembershipApplication.countDocuments({ ...filter, membershipStatus: 'pending' });
    const paidMemberships = await MembershipApplication.countDocuments({ ...filter, paymentStatus: 'paid' });
    const pendingPaymentMemberships = await MembershipApplication.countDocuments({ ...filter, paymentStatus: 'pending' });

    if (isBatchAdmin) {
      const assignedBatch = await Batch.findById(req.user.batch).select('batchName batchCode');
      return successResponse(res, 200, 'Dashboard stats retrieved', {
        totalMemberships,
        approvedMemberships,
        pendingMemberships,
        paidMemberships,
        pendingPaymentMemberships,
        batchName: assignedBatch?.batchName || '',
        batchCode: assignedBatch?.batchCode || '',
        isBatchAdmin: true,
      });
    }

    const totalUsers = await User.countDocuments();
    const totalBatches = await Batch.countDocuments();

    successResponse(res, 200, 'Dashboard stats retrieved', {
      totalUsers,
      totalBatches,
      totalMemberships,
      approvedMemberships,
      pendingMemberships,
      paidMemberships,
      pendingPaymentMemberships,
      isBatchAdmin: false,
    });
  } catch (error) {
    next(error);
  }
};

const getRecentRegistrations = async (req, res, next) => {
  try {
    const isBatchAdmin = req.user && req.user.role === 'batch_admin' && req.user.batch;
    const filter = isBatchAdmin ? { batch: req.user.batch } : {};

    const recent = await MembershipApplication.find(filter)
      .sort({ createdAt: -1 })
      .limit(10)
      .populate('batch', 'batchName batchCode');
    
    successResponse(res, 200, 'Recent registrations retrieved', { recent });
  } catch (error) {
    next(error);
  }
};

const getPendingMemberships = async (req, res, next) => {
  try {
    const isBatchAdmin = req.user && req.user.role === 'batch_admin' && req.user.batch;
    const filter = {
      membershipStatus: 'pending',
      ...(isBatchAdmin ? { batch: req.user.batch } : {}),
    };

    const pending = await MembershipApplication.find(filter)
      .sort({ createdAt: -1 })
      .populate('batch', 'batchName batchCode');
    
    successResponse(res, 200, 'Pending memberships retrieved', { pending });
  } catch (error) {
    next(error);
  }
};

const getBatchStats = async (req, res, next) => {
  try {
    const isBatchAdmin = req.user && req.user.role === 'batch_admin' && req.user.batch;
    const filter = isBatchAdmin ? { _id: req.user.batch } : {};

    const [batches, counts] = await Promise.all([
      Batch.find(filter).select('batchName batchCode totalMembers'),
      MembershipApplication.aggregate([
        { $match: { membershipStatus: { $ne: 'rejected' } } },
        { $group: { _id: '$batch', count: { $sum: 1 } } },
      ]),
    ]);

    const countMap = new Map();
    counts.forEach((c) => {
      if (c._id) {
        countMap.set(c._id.toString(), c.count);
      }
    });

    const enrichedBatches = batches.map((batch) => {
      const batchObj = batch.toObject ? batch.toObject() : { ...batch };
      const memberCount = countMap.get(batch._id.toString()) || 0;
      return {
        ...batchObj,
        totalMembers: memberCount,
        memberCount: memberCount,
      };
    });

    successResponse(res, 200, 'Batch stats retrieved', { batches: enrichedBatches });
  } catch (error) {
    next(error);
  }
};

export { 
  getStats,
  getRecentRegistrations,
  getPendingMemberships,
  getBatchStats,
};
