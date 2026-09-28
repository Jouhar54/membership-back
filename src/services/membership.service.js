import Membership from '../models/Membership.js';
import Batch from '../models/Batch.js';
import ActivityLog from '../models/ActivityLog.js';
import { generateMembershipId } from '../utils/generateMembershipId.js';
import { generatePoster } from './poster.service.js';
import { sendPosterEmail } from './mail.service.js';

const registerMembership = async (userId, batchId) => {
  const existingMembership = await Membership.findOne({ user: userId, batch: batchId });
  if (existingMembership) {
    throw new Error('Already registered for this batch');
  }

  const membership = await Membership.create({
    user: userId,
    batch: batchId,
  });

  // Log activity
  await ActivityLog.create({
    user: userId,
    action: 'Registered for membership',
    performedBy: userId,
    metadata: { batchId },
  });

  // Update batch total members
  await Batch.findByIdAndUpdate(batchId, { $inc: { totalMembers: 1 } });

  return membership;
};

const getMyMemberships = async (userId) => {
  return await Membership.find({ user: userId }).populate('batch', 'batchName batchCode');
};

const getMembershipById = async (id) => {
  const membership = await Membership.findById(id).populate('user', '-password').populate('batch');
  if (!membership) throw new Error('Membership not found');
  return membership;
};

const getMembershipsByBatch = async (batchId, filters = {}) => {
  const query = {};
  if (batchId && batchId !== 'all') {
    query.batch = batchId;
  }
  if (filters.status || filters.membershipStatus) {
    query.membershipStatus = filters.status || filters.membershipStatus;
  }
  if (filters.paymentStatus) {
    query.paymentStatus = filters.paymentStatus;
  }
  return await Membership.find(query).sort({ createdAt: -1 }).populate('user', '-password').populate('batch');
};

const markAsPaid = async (id, adminId) => {
  const membership = await Membership.findById(id);
  if (!membership) {
    const error = new Error('Membership not found');
    error.statusCode = 404;
    throw error;
  }

  if (membership.membershipStatus === 'rejected') {
    const error = new Error('Cannot mark payment for a rejected application.');
    error.statusCode = 400;
    throw error;
  }

  membership.paymentStatus = 'paid';
  await membership.save();

  await ActivityLog.create({
    user: membership.user,
    action: 'Marked payment as paid',
    performedBy: adminId,
    metadata: { membershipId: id },
  });

  return membership;
};

const approveMembership = async (id, adminId) => {
  let membership = await Membership.findById(id).populate('user');
  if (!membership) {
    const error = new Error('Membership not found');
    error.statusCode = 404;
    throw error;
  }
  if (membership.membershipStatus === 'rejected') {
    const error = new Error('Cannot approve a rejected membership');
    error.statusCode = 400;
    throw error;
  }
  if (membership.paymentStatus !== 'paid') {
    const error = new Error('Cannot approve application without payment being marked as paid.');
    error.statusCode = 400;
    throw error;
  }
  if (membership.membershipStatus === 'approved') {
    const error = new Error('Already approved');
    error.statusCode = 400;
    throw error;
  }

  const memId = generateMembershipId();

  membership.membershipStatus = 'approved';
  membership.approvedBy = adminId;
  membership.approvedAt = new Date();
  membership.membershipId = memId;

  await membership.save();

  await ActivityLog.create({
    user: membership.user._id,
    action: 'Membership approved',
    performedBy: adminId,
    metadata: { membershipId: memId },
  });

  // Background Tasks
  generateAndSendPoster(membership._id);

  return membership;
};

const generateAndSendPoster = async (membershipId) => {
  try {
    const membership = await Membership.findById(membershipId).populate('user');
    if (!membership) return;

    // Generate Poster
    const posterUrl = await generatePoster(membership.user, membership.membershipId);
    membership.posterUrl = posterUrl;
    membership.posterGenerated = true;

    // Send Email
    const emailSent = await sendPosterEmail(membership.user.email, membership.user.fullName, posterUrl);
    membership.emailSent = emailSent;

    await membership.save();

    await ActivityLog.create({
      user: membership.user._id,
      action: 'Poster generated and email sent',
      performedBy: membership.approvedBy,
      metadata: { posterUrl, emailSent },
    });
  } catch (error) {
    console.error('Error in background job for poster/email:', error);
  }
};

const rejectMembership = async (id, adminId, reason = '') => {
  const membership = await Membership.findById(id);
  if (!membership) {
    const error = new Error('Membership not found');
    error.statusCode = 404;
    throw error;
  }

  membership.membershipStatus = 'rejected';
  if (reason) {
    membership.rejectionReason = reason;
  }
  membership.rejectedAt = new Date();
  membership.rejectedBy = adminId;
  await membership.save();

  await ActivityLog.create({
    user: membership.user,
    action: 'Membership rejected',
    performedBy: adminId,
    metadata: { membershipId: id, rejectionReason: reason },
  });

  return membership;
};

export { 
  registerMembership,
  getMyMemberships,
  getMembershipById,
  getMembershipsByBatch,
  markAsPaid,
  approveMembership,
  rejectMembership,
 };
