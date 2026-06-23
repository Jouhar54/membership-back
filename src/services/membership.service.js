const Membership = require('../models/Membership');
const Batch = require('../models/Batch');
const ActivityLog = require('../models/ActivityLog');
const { generateMembershipId } = require('../utils/generateMembershipId');
const { generatePoster } = require('./poster.service');
const { sendPosterEmail } = require('./mail.service');

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

const getMembershipsByBatch = async (batchId) => {
  return await Membership.find({ batch: batchId }).populate('user', '-password');
};

const markAsPaid = async (id, adminId) => {
  const membership = await Membership.findByIdAndUpdate(
    id,
    { paymentStatus: 'paid' },
    { new: true }
  );
  if (!membership) throw new Error('Membership not found');

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
  if (!membership) throw new Error('Membership not found');
  if (membership.paymentStatus !== 'paid') throw new Error('Cannot approve unpaid membership');
  if (membership.membershipStatus === 'approved') throw new Error('Already approved');

  const memId = generateMembershipId();

  membership.membershipStatus = 'approved';
  membership.approvedBy = adminId;
  membership.approvedAt = Date.now();
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

const rejectMembership = async (id, adminId) => {
  const membership = await Membership.findByIdAndUpdate(
    id,
    { membershipStatus: 'rejected' },
    { new: true }
  );
  if (!membership) throw new Error('Membership not found');

  await ActivityLog.create({
    user: membership.user,
    action: 'Membership rejected',
    performedBy: adminId,
    metadata: { membershipId: id },
  });

  return membership;
};

module.exports = {
  registerMembership,
  getMyMemberships,
  getMembershipById,
  getMembershipsByBatch,
  markAsPaid,
  approveMembership,
  rejectMembership,
};
