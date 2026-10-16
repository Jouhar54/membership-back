import mongoose from 'mongoose';
import MembershipApplication from '../models/MembershipApplication.js';
import Batch from '../models/Batch.js';
import User from '../models/User.js';
import ActivityLog from '../models/ActivityLog.js';
import cloudinary from '../config/cloudinary.js';
import { generatePoster } from './poster.service.js';
import { generateMembershipId } from '../utils/generateMembershipId.js';

const uploadToCloudinary = (fileBuffer, folder) => {
  return new Promise((resolve, reject) => {
    const uploadStream = cloudinary.uploader.upload_stream(
      { folder },
      (error, result) => {
        if (error) return reject(error);
        resolve(result.secure_url);
      }
    );
    uploadStream.end(fileBuffer);
  });
};

const createApplication = async (applicationData, fileBuffer = null) => {
  const {
    fullName,
    fatherName,
    dob,
    bloodGroup,
    houseName,
    place,
    post,
    pin,
    whatsapp,
    phone,
    email,
    district,
    state,
    panchayath,
    mandalam,
    thaluk,
    jobType,
    jobTypeOther,
    anwariCertificateNo,
    declarationAccepted,
    declarationDate,
    batchId,
  } = applicationData;

  let profilePhotoBuffer = null;
  let paymentScreenshotBuffer = null;

  if (fileBuffer instanceof Buffer) {
    profilePhotoBuffer = fileBuffer;
  } else if (fileBuffer && typeof fileBuffer === 'object') {
    profilePhotoBuffer = fileBuffer.profilePhotoBuffer || null;
    paymentScreenshotBuffer = fileBuffer.paymentScreenshotBuffer || null;
  }

  // 1. Validate batch exists
  const batch = await Batch.findById(batchId);
  if (!batch) {
    throw new Error('Batch not found');
  }

  // 2. Validate uniqueness in MembershipApplication
  const emailExists = await MembershipApplication.findOne({ email });
  if (emailExists) {
    throw new Error('Application with this email already exists');
  }

  const phoneExists = await MembershipApplication.findOne({ phone });
  if (phoneExists) {
    throw new Error('Application with this phone number already exists');
  }

  // 3. Upload profile photo to Cloudinary
  let profilePhotoUrl = '';
  if (profilePhotoBuffer) {
    profilePhotoUrl = await uploadToCloudinary(profilePhotoBuffer, 'aalia_profiles');
  }

  // 3.1 Upload payment screenshot to Cloudinary
  let paymentScreenshotUrl = '';
  if (paymentScreenshotBuffer) {
    paymentScreenshotUrl = await uploadToCloudinary(paymentScreenshotBuffer, 'aalia_payments');
  }

  // 4. Store application
  const application = await MembershipApplication.create({
    fullName: (fullName || '').toUpperCase(),
    fatherName,
    dob,
    bloodGroup,
    houseName,
    place,
    post,
    pin,
    whatsapp,
    phone,
    email,
    district,
    state: state || 'Kerala',
    panchayath,
    mandalam,
    thaluk,
    jobType,
    jobTypeOther,
    anwariCertificateNo: anwariCertificateNo || '',
    declarationAccepted: declarationAccepted === 'true' || declarationAccepted === true,
    declarationDate: declarationDate || new Date().toISOString().split('T')[0],
    batch: batchId,
    profilePhoto: profilePhotoUrl,
    paymentScreenshot: paymentScreenshotUrl,
    paymentProof: paymentScreenshotUrl,
    paymentStatus: 'pending',
    membershipStatus: 'pending',
  });

  // Log activity
  const admin = await User.findOne({ role: 'admin' });
  const performedBy = admin ? admin._id : application._id;

  await ActivityLog.create({
    user: application._id,
    action: 'APPLICATION_CREATED',
    performedBy,
    metadata: { email: application.email, batchId },
  });

  // Update batch total members
  if (batchId) {
    await Batch.findByIdAndUpdate(batchId, { $inc: { totalMembers: 1 } });
  }

  return application;
};

const checkApplicationStatus = async (searchKey) => {
  const query = [
    { email: searchKey },
    { phone: searchKey },
    { membershipId: searchKey },
  ];
  if (mongoose.Types.ObjectId.isValid(searchKey)) {
    query.push({ _id: searchKey });
  }

  const application = await MembershipApplication.findOne({
    $or: query
  }).populate('batch');

  if (!application) {
    const error = new Error('Application not found');
    error.statusCode = 404;
    throw error;
  }

  if (application.membershipStatus === 'rejected') {
    return {
      status: 'rejected',
      message: 'Your application has been rejected.',
      rejectionReason: application.rejectionReason || null,
      rejectedAt: application.rejectedAt || null,
      _id: application._id,
    };
  }

  if (application.membershipStatus === 'approved') {
    return {
      status: 'approved',
      posterUrl: application.posterUrl,
      membershipId: application.membershipId,
      _id: application._id,
    };
  }

  if (application.paymentStatus === 'paid' && application.membershipStatus === 'pending') {
    return {
      status: 'paid_pending_approval',
      message: 'Payment received. Waiting for approval',
      _id: application._id,
    };
  }

  // Default pending
  return {
    status: 'pending',
    message: 'Your application is under review',
    _id: application._id,
  };
};

const getApplicationById = async (id) => {
  const application = await MembershipApplication.findById(id).populate('batch');
  if (!application) {
    const error = new Error('Application not found');
    error.statusCode = 404;
    throw error;
  }
  return application;
};

const getPosterById = async (id) => {
  const application = await MembershipApplication.findById(id);
  if (!application) {
    const error = new Error('Application not found');
    error.statusCode = 404;
    throw error;
  }
  if (application.membershipStatus !== 'approved') {
    const error = new Error('Poster not available. Application is not approved yet.');
    error.statusCode = 400;
    throw error;
  }
  return application.posterUrl;
};

const getApplicationsByBatch = async (batchId, filters = {}) => {
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
  if (filters.search) {
    const regex = new RegExp(filters.search.trim(), 'i');
    query.$or = [
      { fullName: regex },
      { email: regex },
      { phone: regex },
    ];
  }
  return await MembershipApplication.find(query).sort({ createdAt: -1 }).populate('batch');
};

const markAsPaid = async (id, adminId) => {
  const application = await MembershipApplication.findById(id);
  if (!application) {
    const error = new Error('Application not found');
    error.statusCode = 404;
    throw error;
  }

  if (application.membershipStatus === 'rejected') {
    const error = new Error('Cannot mark payment for a rejected application.');
    error.statusCode = 400;
    throw error;
  }

  application.paymentStatus = 'paid';
  await application.save();

  await ActivityLog.create({
    user: application._id,
    action: 'PAYMENT_MARKED',
    performedBy: adminId,
    metadata: { applicationId: id },
  });

  return application;
};

const approveApplication = async (id, adminId) => {
  const application = await MembershipApplication.findById(id).populate('batch');
  if (!application) {
    const error = new Error('Application not found');
    error.statusCode = 404;
    throw error;
  }
  if (application.membershipStatus === 'rejected') {
    const error = new Error('Cannot approve a rejected application');
    error.statusCode = 400;
    throw error;
  }
  if (application.paymentStatus !== 'paid') {
    const error = new Error('Cannot approve application without payment being marked as paid.');
    error.statusCode = 400;
    throw error;
  }
  if (application.membershipStatus === 'approved') {
    const error = new Error('Application already approved');
    error.statusCode = 400;
    throw error;
  }

  const membershipId = generateMembershipId();

  // Update statuses immediately
  application.membershipStatus = 'approved';
  application.membershipId = membershipId;
  application.approvedBy = adminId;
  application.approvedAt = new Date();

  await application.save();

  // Activity Log for Approval
  await ActivityLog.create({
    user: application._id,
    action: 'APPLICATION_APPROVED',
    performedBy: adminId,
    metadata: { membershipId },
  });

  // Background Task: generate poster & send email asynchronously without blocking the response
  generateAndSendApplicationPoster(application._id, adminId);

  return application;
};

const generateAndSendApplicationPoster = async (applicationId, adminId) => {
  try {
    const application = await MembershipApplication.findById(applicationId).populate('batch');
    if (!application) return;

    // Generate poster
    const userDetails = {
      fullName: application.fullName,
      district: application.district,
      profilePhoto: application.profilePhoto,
      batchName: application.batch ? application.batch.batchName : null,
    };

    const posterUrl = await generatePoster(userDetails, application.membershipId);

    application.posterUrl = posterUrl;
    application.posterGenerated = true;
    await application.save();

    await ActivityLog.create({
      user: application._id,
      action: 'POSTER_GENERATED',
      performedBy: adminId,
      metadata: { posterUrl },
    });
  } catch (error) {
    console.error('Error in background job for application poster:', error);
  }
};

const rejectApplication = async (id, adminId, reason = '') => {
  const application = await MembershipApplication.findById(id);
  if (!application) {
    const error = new Error('Application not found');
    error.statusCode = 404;
    throw error;
  }

  const wasAlreadyRejected = application.membershipStatus === 'rejected';

  application.membershipStatus = 'rejected';
  if (reason) {
    application.rejectionReason = reason;
  }
  application.rejectedAt = new Date();
  application.rejectedBy = adminId;
  await application.save();

  // If application was not previously rejected, decrement batch member count
  if (!wasAlreadyRejected && application.batch) {
    await Batch.findByIdAndUpdate(application.batch, { $inc: { totalMembers: -1 } });
  }

  await ActivityLog.create({
    user: application._id,
    action: 'APPLICATION_REJECTED',
    performedBy: adminId,
    metadata: { applicationId: id, rejectionReason: reason },
  });

  return application;
};

export {
  createApplication,
  checkApplicationStatus,
  getApplicationById,
  getPosterById,
  getApplicationsByBatch,
  markAsPaid,
  approveApplication,
  rejectApplication,
};
