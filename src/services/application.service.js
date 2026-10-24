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
    phone: rawPhone,
    phone_number,
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

  const phone = (rawPhone || phone_number || '').trim();

  let profilePhotoBuffer = null;
  let paymentScreenshotBuffer = null;
  let signatureBuffer = null;

  if (fileBuffer instanceof Buffer) {
    profilePhotoBuffer = fileBuffer;
  } else if (fileBuffer && typeof fileBuffer === 'object') {
    profilePhotoBuffer = fileBuffer.profilePhotoBuffer || null;
    paymentScreenshotBuffer = fileBuffer.paymentScreenshotBuffer || null;
    signatureBuffer = fileBuffer.signatureBuffer || null;
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

  // 3.2 Upload signature to Cloudinary if provided
  let signatureUrl = '';
  if (signatureBuffer) {
    signatureUrl = await uploadToCloudinary(signatureBuffer, 'aalia_signatures');
  } else if (applicationData.signature) {
    signatureUrl = applicationData.signature;
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
    signature: signatureUrl || undefined,
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
  const trimmed = (searchKey || '').trim();
  const digitsOnly = trimmed.replace(/\D/g, '');
  const query = [
    { email: trimmed.toLowerCase() },
    { phone: trimmed },
    { membershipId: trimmed },
  ];
  if (digitsOnly.length >= 7) {
    query.push({ phone: `+${digitsOnly}` });
    query.push({ phone: digitsOnly });
    if (digitsOnly.length === 10) {
      query.push({ phone: `+91${digitsOnly}` });
    }
  }
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
  } else if (filters.batch && filters.batch !== 'all') {
    query.batch = filters.batch;
  } else if (filters.batchId && filters.batchId !== 'all') {
    query.batch = filters.batchId;
  }

  if (filters.status || filters.membershipStatus) {
    query.membershipStatus = filters.status || filters.membershipStatus;
  }
  if (filters.paymentStatus) {
    query.paymentStatus = filters.paymentStatus;
  }
  if (filters.district) {
    query.district = filters.district;
  }
  if (filters.search && filters.search.trim()) {
    const escapedSearch = filters.search.trim().replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const regex = new RegExp(escapedSearch, 'i');
    query.$or = [
      { fullName: regex },
      { email: regex },
      { phone: regex },
      { membershipId: regex },
    ];
  }

  const sort = {};
  if (filters.sortBy) {
    const order = filters.sortOrder === 'asc' || filters.sortOrder === '1' || filters.order === 'asc' ? 1 : -1;
    sort[filters.sortBy] = order;
  } else {
    sort.createdAt = -1;
  }

  if (filters.paginate === 'false' || filters.all === 'true') {
    const applications = await MembershipApplication.find(query)
      .sort(sort)
      .populate('batch');
    const total = applications.length;

    return {
      applications,
      total,
      page: 1,
      limit: total,
      totalPages: total > 0 ? 1 : 0,
      pagination: {
        total,
        page: 1,
        limit: total,
        totalPages: total > 0 ? 1 : 0,
        hasNextPage: false,
        hasPrevPage: false,
      },
    };
  }

  const page = Math.max(1, parseInt(filters.page, 10) || 1);
  const limit = Math.max(1, parseInt(filters.limit, 10) || 10);
  const skip = (page - 1) * limit;

  const [applications, total] = await Promise.all([
    MembershipApplication.find(query)
      .sort(sort)
      .skip(skip)
      .limit(limit)
      .populate('batch'),
    MembershipApplication.countDocuments(query),
  ]);

  const totalPages = Math.ceil(total / limit);

  return {
    applications,
    total,
    page,
    limit,
    totalPages,
    pagination: {
      total,
      page,
      limit,
      totalPages,
      hasNextPage: page < totalPages,
      hasPrevPage: page > 1,
    },
  };
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

const undoRejectApplication = async (id, adminId) => {
  const application = await MembershipApplication.findById(id);
  if (!application) {
    const error = new Error('Application not found');
    error.statusCode = 404;
    throw error;
  }

  if (application.membershipStatus !== 'rejected') {
    const error = new Error('Only rejected applications can be restored.');
    error.statusCode = 400;
    throw error;
  }

  application.membershipStatus = 'pending';
  application.rejectionReason = null;
  application.rejectedAt = null;
  application.rejectedBy = null;
  await application.save();

  // Restore batch member count if decremented
  if (application.batch) {
    await Batch.findByIdAndUpdate(application.batch, { $inc: { totalMembers: 1 } });
  }

  await ActivityLog.create({
    user: application._id,
    action: 'APPLICATION_REJECTION_UNDONE',
    performedBy: adminId,
    metadata: { applicationId: id },
  });

  return application;
};


const updateApplication = async (id, updateData, fileBuffers = {}, user = null) => {
  const application = await MembershipApplication.findById(id);
  if (!application) {
    const error = new Error('Application not found');
    error.statusCode = 404;
    throw error;
  }

  const isAdmin = Boolean(user && user.role === 'admin');
  const isBatchAdmin = Boolean(user && user.role === 'batch_admin');

  const getUserBatchId = (u) => {
    if (!u) return null;
    if (u.batch && u.batch._id) return u.batch._id.toString();
    if (u.batch) return u.batch.toString();
    if (u.batchId) return u.batchId.toString();
    return null;
  };

  const getApplicationBatchId = (app) => {
    if (!app) return null;
    if (app.batch && app.batch._id) return app.batch._id.toString();
    if (app.batch) return app.batch.toString();
    return null;
  };

  const userBatchId = getUserBatchId(user);
  const appBatchId = getApplicationBatchId(application);
  const isAuthorizedBatchAdmin = isBatchAdmin && Boolean(userBatchId) && userBatchId === appBatchId;

  // 1. Permission & Access Control
  if (application.membershipStatus === 'approved') {
    if (!isAdmin && !isAuthorizedBatchAdmin) {
      const error = new Error('Approved applications cannot be modified online');
      error.statusCode = 403;
      throw error;
    }
  } else if (isBatchAdmin && !isAuthorizedBatchAdmin) {
    const error = new Error('You are not authorized to update applications outside your assigned batch');
    error.statusCode = 403;
    throw error;
  }

  // Prevent batch_admin from changing the batch ID to another batch
  const requestedBatchId = (updateData.batchId || updateData.batch || '').toString();
  if (isBatchAdmin && requestedBatchId && requestedBatchId !== appBatchId) {
    const error = new Error('Batch admins cannot change the batch of an application');
    error.statusCode = 403;
    throw error;
  }

  // 2. Validate batch if changed (by admin or allowed non-batch_admin on pending/rejected apps)
  const newBatchId = updateData.batchId || updateData.batch;
  if (!isBatchAdmin && newBatchId && String(newBatchId) !== String(appBatchId)) {
    const batch = await Batch.findById(newBatchId);
    if (!batch) {
      const error = new Error('Batch not found');
      error.statusCode = 404;
      throw error;
    }
    if (application.membershipStatus !== 'rejected') {
      if (application.batch) {
        await Batch.findByIdAndUpdate(application.batch, { $inc: { totalMembers: -1 } });
      }
      await Batch.findByIdAndUpdate(newBatchId, { $inc: { totalMembers: 1 } });
    }
    application.batch = newBatchId;
  }

  // 3. Uniqueness checks for email and phone excluding self
  const newEmail = updateData.email ? updateData.email.trim().toLowerCase() : null;
  if (newEmail && newEmail !== application.email) {
    const emailExists = await MembershipApplication.findOne({ email: newEmail, _id: { $ne: id } });
    if (emailExists) {
      const error = new Error('Application with this email already exists');
      error.statusCode = 400;
      throw error;
    }
    application.email = newEmail;
  }

  const rawPhone = updateData.phone_number || updateData.phone;
  const newPhone = rawPhone ? String(rawPhone).replace(/[\s\-()]/g, '').trim() : null;
  if (newPhone && newPhone !== application.phone) {
    const phoneExists = await MembershipApplication.findOne({ phone: newPhone, _id: { $ne: id } });
    if (phoneExists) {
      const error = new Error('Application with this phone number already exists');
      error.statusCode = 400;
      throw error;
    }
    application.phone = newPhone;
  }

  // 4. Upload / update photos, payment screenshot, signature
  let isProfilePhotoChanged = false;

  if (fileBuffers.profilePhotoBuffer) {
    application.profilePhoto = await uploadToCloudinary(fileBuffers.profilePhotoBuffer, 'aalia_profiles');
    isProfilePhotoChanged = true;
  } else if (updateData.profilePhoto !== undefined && typeof updateData.profilePhoto === 'string' && updateData.profilePhoto.trim() !== '') {
    const trimmedPhoto = updateData.profilePhoto.trim();
    if (trimmedPhoto !== application.profilePhoto) {
      application.profilePhoto = trimmedPhoto;
      isProfilePhotoChanged = true;
    }
  }

  if (fileBuffers.paymentScreenshotBuffer) {
    const paymentUrl = await uploadToCloudinary(fileBuffers.paymentScreenshotBuffer, 'aalia_payments');
    application.paymentScreenshot = paymentUrl;
    application.paymentProof = paymentUrl;
  } else {
    const newPaymentUrl = updateData.paymentProof || updateData.paymentScreenshot;
    if (newPaymentUrl !== undefined && typeof newPaymentUrl === 'string' && newPaymentUrl.trim() !== '') {
      application.paymentScreenshot = newPaymentUrl.trim();
      application.paymentProof = newPaymentUrl.trim();
    }
  }

  if (fileBuffers.signatureBuffer) {
    application.signature = await uploadToCloudinary(fileBuffers.signatureBuffer, 'aalia_signatures');
  } else if (updateData.signature !== undefined && typeof updateData.signature === 'string' && updateData.signature.trim() !== '') {
    application.signature = updateData.signature.trim();
  }

  // 5. Update partial text fields
  const sanitize = (val) => (typeof val === 'string' ? val.trim() : val);

  if (updateData.fullName !== undefined) application.fullName = String(updateData.fullName).trim().toUpperCase();
  if (updateData.fatherName !== undefined) application.fatherName = sanitize(updateData.fatherName);
  if (updateData.dob !== undefined) application.dob = sanitize(updateData.dob);
  if (updateData.bloodGroup !== undefined) application.bloodGroup = sanitize(updateData.bloodGroup);
  if (updateData.houseName !== undefined) application.houseName = sanitize(updateData.houseName);
  if (updateData.place !== undefined) application.place = sanitize(updateData.place);
  if (updateData.post !== undefined) application.post = sanitize(updateData.post);
  if (updateData.pin !== undefined) application.pin = sanitize(updateData.pin);
  if (updateData.whatsapp !== undefined) application.whatsapp = sanitize(updateData.whatsapp);
  if (updateData.district !== undefined) application.district = sanitize(updateData.district);
  if (updateData.state !== undefined) application.state = sanitize(updateData.state);
  if (updateData.panchayath !== undefined) application.panchayath = sanitize(updateData.panchayath);
  if (updateData.mandalam !== undefined) application.mandalam = sanitize(updateData.mandalam);
  if (updateData.thaluk !== undefined) application.thaluk = sanitize(updateData.thaluk);
  if (updateData.jobType !== undefined) application.jobType = sanitize(updateData.jobType);
  if (updateData.jobTypeOther !== undefined) application.jobTypeOther = sanitize(updateData.jobTypeOther);
  if (updateData.anwariCertificateNo !== undefined) application.anwariCertificateNo = sanitize(updateData.anwariCertificateNo);

  // 6. Status preservation:
  // - Only reset membershipStatus to 'pending' if previously 'rejected'
  // - If application.membershipStatus === 'approved', DO NOT reset membershipStatus, DO NOT wipe membershipId, approvedAt, approvedBy
  if (application.membershipStatus === 'rejected') {
    application.membershipStatus = 'pending';
    application.rejectionReason = null;
    application.rejectedAt = null;
    application.rejectedBy = null;
    if (application.batch) {
      await Batch.findByIdAndUpdate(application.batch, { $inc: { totalMembers: 1 } });
    }
  }

  await application.save();

  // 7. Poster Regeneration (ONLY on Profile Photo Change for Approved Applications):
  // Only trigger poster regeneration if application was approved AND profilePhoto changed
  const adminUser = await User.findOne({ role: 'admin' });
  const performedBy = user ? user._id : (adminUser ? adminUser._id : application._id);

  if (application.membershipStatus === 'approved' && isProfilePhotoChanged) {
    generateAndSendApplicationPoster(application._id, performedBy);
  }

  // 8. Log activity
  await ActivityLog.create({
    user: application._id,
    action: 'APPLICATION_UPDATED',
    performedBy,
    metadata: {
      applicationId: id,
      posterRegenerated: Boolean(application.membershipStatus === 'approved' && isProfilePhotoChanged),
    },
  });

  return await MembershipApplication.findById(id).populate('batch');
};

export {
  createApplication,
  updateApplication,
  checkApplicationStatus,
  getApplicationById,
  getPosterById,
  getApplicationsByBatch,
  markAsPaid,
  approveApplication,
  rejectApplication,
  undoRejectApplication,
};
