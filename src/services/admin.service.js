import bcrypt from 'bcryptjs';
import User from '../models/User.js';
import Batch from '../models/Batch.js';
import ActivityLog from '../models/ActivityLog.js';

const createBatchAdmin = async (adminData, performedBy) => {
  const { fullName, email, phone, password, batchId } = adminData;

  // Check unique constraints
  const userExists = await User.findOne({ $or: [{ email }, { phone }] });
  if (userExists) {
    throw new Error('User with email or phone already exists');
  }

  // Verify batch exists
  const batch = await Batch.findById(batchId);
  if (!batch) {
    throw new Error('Batch not found');
  }

  // Hash password
  const salt = await bcrypt.genSalt(10);
  const hashedPassword = await bcrypt.hash(password, salt);

  // Create batch admin user
  const user = await User.create({
    fullName: fullName.toUpperCase(),
    email,
    phone,
    password: hashedPassword,
    role: 'batch_admin',
    batch: batchId,
  });

  // Add coordinator to batch
  if (!batch.coordinators.includes(user._id)) {
    batch.coordinators.push(user._id);
    await batch.save();
  }

  // Log activity
  await ActivityLog.create({
    user: user._id,
    action: 'BATCH_ADMIN_CREATED',
    performedBy,
    metadata: { email: user.email, batchId },
  });

  return user;
};

const getBatchAdmins = async (filters = {}, pagination = {}) => {
  const query = { role: 'batch_admin' };

  if (filters.search) {
    const searchRegex = new RegExp(filters.search, 'i');
    query.$or = [
      { fullName: searchRegex },
      { email: searchRegex }
    ];
  }

  const page = parseInt(pagination.page) || 1;
  const limit = parseInt(pagination.limit) || 10;
  const skip = (page - 1) * limit;

  const admins = await User.find(query)
    .populate('batch')
    .skip(skip)
    .limit(limit)
    .sort({ createdAt: -1 });

  const total = await User.countDocuments(query);

  return {
    admins,
    total,
    page,
    limit,
    totalPages: Math.ceil(total / limit),
  };
};

const getBatchAdminById = async (id) => {
  const admin = await User.findOne({ _id: id, role: 'batch_admin' }).populate('batch');
  if (!admin) {
    throw new Error('Batch admin not found');
  }
  return admin;
};

const updateBatchAdmin = async (id, updateData, performedBy) => {
  const admin = await User.findOne({ _id: id, role: 'batch_admin' });
  if (!admin) {
    throw new Error('Batch admin not found');
  }

  const { fullName, email, phone, batchId } = updateData;

  // Check uniqueness if email/phone updated
  if (email && email !== admin.email) {
    const emailExists = await User.findOne({ email });
    if (emailExists) {
      throw new Error('Email is already registered by another user');
    }
    admin.email = email;
  }

  if (phone && phone !== admin.phone) {
    const phoneExists = await User.findOne({ phone });
    if (phoneExists) {
      throw new Error('Phone number is already registered by another user');
    }
    admin.phone = phone;
  }

  if (fullName) {
    admin.fullName = fullName.toUpperCase();
  }

  // Handle batch reassignment
  if (batchId && batchId !== admin.batch?.toString()) {
    const newBatch = await Batch.findById(batchId);
    if (!newBatch) {
      throw new Error('New batch not found');
    }

    // Remove from old batch coordinators
    if (admin.batch) {
      await Batch.findByIdAndUpdate(admin.batch, {
        $pull: { coordinators: admin._id }
      });
    }

    // Add to new batch coordinators
    if (!newBatch.coordinators.includes(admin._id)) {
      newBatch.coordinators.push(admin._id);
      await newBatch.save();
    }

    admin.batch = batchId;
  }

  await admin.save();

  // Log activity
  await ActivityLog.create({
    user: admin._id,
    action: 'BATCH_ADMIN_UPDATED',
    performedBy,
    metadata: { updatedFields: Object.keys(updateData) },
  });

  return admin;
};

const deleteBatchAdmin = async (id, performedBy) => {
  const admin = await User.findOne({ _id: id, role: 'batch_admin' });
  if (!admin) {
    throw new Error('Batch admin not found');
  }

  // Remove from batch coordinators
  if (admin.batch) {
    await Batch.findByIdAndUpdate(admin.batch, {
      $pull: { coordinators: admin._id }
    });
  }

  // Delete User
  await User.findByIdAndDelete(id);

  // Log activity
  await ActivityLog.create({
    user: id,
    action: 'BATCH_ADMIN_DELETED',
    performedBy,
    metadata: { email: admin.email },
  });

  return true;
};

export {
  createBatchAdmin,
  getBatchAdmins,
  getBatchAdminById,
  updateBatchAdmin,
  deleteBatchAdmin,
};
