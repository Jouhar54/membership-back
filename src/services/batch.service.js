import bcrypt from 'bcryptjs';
import Batch from '../models/Batch.js';
import User from '../models/User.js';
import MembershipApplication from '../models/MembershipApplication.js';
import ActivityLog from '../models/ActivityLog.js';

const syncBatchMemberCounts = async () => {
  try {
    const counts = await MembershipApplication.aggregate([
      { $match: { membershipStatus: { $ne: 'rejected' } } },
      { $group: { _id: '$batch', count: { $sum: 1 } } },
    ]);

    await Batch.updateMany({}, { $set: { totalMembers: 0 } });

    const bulkOps = counts
      .filter((c) => c._id)
      .map((c) => ({
        updateOne: {
          filter: { _id: c._id },
          update: { $set: { totalMembers: c.count } },
        },
      }));

    if (bulkOps.length > 0) {
      await Batch.bulkWrite(bulkOps);
    }
  } catch (err) {
    console.error('Error syncing batch member counts:', err);
  }
};

const createBatch = async (batchData) => {
  const { batchName, batchCode, joinLink, coordinators } = batchData;

  const batchExists = await Batch.findOne({ batchCode });
  if (batchExists) {
    throw new Error('Batch code already exists');
  }

  const batch = await Batch.create({
    batchName,
    batchCode,
    joinLink,
    coordinators,
    totalMembers: 0,
  });

  const batchObj = batch.toObject ? batch.toObject() : { ...batch };
  return {
    ...batchObj,
    totalMembers: 0,
    memberCount: 0,
  };
};

const getBatches = async () => {
  const [batches, counts] = await Promise.all([
    Batch.find().populate('coordinators', 'fullName email phone'),
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

  return batches.map((batch) => {
    const batchObj = batch.toObject ? batch.toObject() : { ...batch };
    const memberCount = countMap.get(batch._id.toString()) || 0;
    return {
      ...batchObj,
      totalMembers: memberCount,
      memberCount: memberCount,
    };
  });
};

const getBatchById = async (id) => {
  const [batch, count] = await Promise.all([
    Batch.findById(id).populate('coordinators', 'fullName email phone'),
    MembershipApplication.countDocuments({
      batch: id,
      membershipStatus: { $ne: 'rejected' },
    }),
  ]);
  if (!batch) throw new Error('Batch not found');
  const batchObj = batch.toObject ? batch.toObject() : { ...batch };
  return {
    ...batchObj,
    totalMembers: count,
    memberCount: count,
  };
};

const updateBatch = async (id, updateData) => {
  const batch = await Batch.findByIdAndUpdate(id, updateData, { new: true, runValidators: true }).populate('coordinators', 'fullName email phone');
  if (!batch) throw new Error('Batch not found');
  const count = await MembershipApplication.countDocuments({
    batch: id,
    membershipStatus: { $ne: 'rejected' },
  });
  const batchObj = batch.toObject ? batch.toObject() : { ...batch };
  return {
    ...batchObj,
    totalMembers: count,
    memberCount: count,
  };
};

const deleteBatch = async (id, performedBy, password) => {
  if (!password) {
    const error = new Error('Administrator password is required');
    error.statusCode = 400;
    throw error;
  }

  const admin = await User.findById(performedBy);
  if (!admin) {
    const error = new Error('Administrator account not found');
    error.statusCode = 404;
    throw error;
  }

  const isMatch = await bcrypt.compare(password, admin.password);
  if (!isMatch) {
    const error = new Error('Invalid administrator password');
    error.statusCode = 401;
    throw error;
  }

  const batch = await Batch.findByIdAndDelete(id);
  if (!batch) {
    const error = new Error('Batch not found');
    error.statusCode = 404;
    throw error;
  }

  // Remove batch association from any users assigned to this batch
  await User.updateMany({ batch: id }, { $unset: { batch: 1 } });

  // Log activity
  await ActivityLog.create({
    user: admin._id,
    action: 'BATCH_DELETED',
    performedBy,
    metadata: { batchId: id, batchName: batch.batchName, batchCode: batch.batchCode },
  });

  return batch;
};

export { 
  createBatch,
  getBatches,
  getBatchById,
  updateBatch,
  deleteBatch,
  syncBatchMemberCounts,
 };
