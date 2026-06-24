import Membership from '../models/Membership.js';
import Batch from '../models/Batch.js';
import User from '../models/User.js';
import { successResponse } from '../utils/response.js';

const getStats = async (req, res, next) => {
  try {
    const totalUsers = await User.countDocuments();
    const totalBatches = await Batch.countDocuments();
    const totalMemberships = await Membership.countDocuments();
    const approvedMemberships = await Membership.countDocuments({ membershipStatus: 'approved' });

    successResponse(res, 200, 'Dashboard stats retrieved', {
      totalUsers,
      totalBatches,
      totalMemberships,
      approvedMemberships,
    });
  } catch (error) {
    next(error);
  }
};

const getPendingMemberships = async (req, res, next) => {
  try {
    const pending = await Membership.find({ membershipStatus: 'pending' })
      .populate('user', 'fullName email phone')
      .populate('batch', 'batchName batchCode');
    
    successResponse(res, 200, 'Pending memberships retrieved', { pending });
  } catch (error) {
    next(error);
  }
};

const getBatchStats = async (req, res, next) => {
  try {
    const batches = await Batch.find().select('batchName batchCode totalMembers');
    successResponse(res, 200, 'Batch stats retrieved', { batches });
  } catch (error) {
    next(error);
  }
};

export { 
  getStats,
  getPendingMemberships,
  getBatchStats,
 };
