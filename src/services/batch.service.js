import bcrypt from 'bcryptjs';
import Batch from '../models/Batch.js';
import User from '../models/User.js';
import ActivityLog from '../models/ActivityLog.js';

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
  });

  return batch;
};

const getBatches = async () => {
  return await Batch.find().populate('coordinators', 'fullName email phone');
};

const getBatchById = async (id) => {
  const batch = await Batch.findById(id).populate('coordinators', 'fullName email phone');
  if (!batch) throw new Error('Batch not found');
  return batch;
};

const updateBatch = async (id, updateData) => {
  const batch = await Batch.findByIdAndUpdate(id, updateData, { new: true, runValidators: true });
  if (!batch) throw new Error('Batch not found');
  return batch;
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
 };
