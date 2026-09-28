import MembershipApplication from '../models/MembershipApplication.js';
import Batch from '../models/Batch.js';
import User from '../models/User.js';
import ActivityLog from '../models/ActivityLog.js';
import cloudinary from '../config/cloudinary.js';
import { generatePoster } from './poster.service.js';
import { sendPosterEmail } from './mail.service.js';
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

const createApplication = async (applicationData, files = {}) => {
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
    declarationAccepted,
    declarationDate,
    batchId,
  } = applicationData;

  const profilePhotoBuffer = files.profilePhotoBuffer || (files instanceof Buffer ? files : null);
  const signatureBuffer = files.signatureBuffer || null;

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

  // 3. Upload profile photo & signature to Cloudinary
  let profilePhotoUrl = '';
  if (profilePhotoBuffer) {
    profilePhotoUrl = await uploadToCloudinary(profilePhotoBuffer, 'aalia_profiles');
  }

  let signatureUrl = '';
  if (signatureBuffer) {
    signatureUrl = await uploadToCloudinary(signatureBuffer, 'aalia_signatures');
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
    declarationAccepted: declarationAccepted === 'true' || declarationAccepted === true,
    declarationDate: declarationDate || new Date().toISOString().split('T')[0],
    batch: batchId,
    profilePhoto: profilePhotoUrl,
    signature: signatureUrl,
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

  return application;
};

const checkApplicationStatus = async (searchKey) => {
  const application = await MembershipApplication.findOne({
    $or: [{ email: searchKey }, { phone: searchKey }]
  }).populate('batch');

  if (!application) {
    throw new Error('Application not found');
  }

  if (application.membershipStatus === 'rejected') {
    return {
      status: 'rejected',
      message: 'Your application has been rejected.',
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
    throw new Error('Application not found');
  }
  return application;
};

const getPosterById = async (id) => {
  const application = await MembershipApplication.findById(id);
  if (!application) {
    throw new Error('Application not found');
  }
  if (application.membershipStatus !== 'approved') {
    throw new Error('Poster not available. Application is not approved yet.');
  }
  return application.posterUrl;
};

const getApplicationsByBatch = async (batchId) => {
  return await MembershipApplication.find({ batch: batchId }).populate('batch');
};

const markAsPaid = async (id, adminId) => {
  const application = await MembershipApplication.findById(id);
  if (!application) {
    throw new Error('Application not found');
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
    throw new Error('Application not found');
  }
  if (application.paymentStatus !== 'paid') {
    throw new Error('Cannot approve unpaid application');
  }
  if (application.membershipStatus === 'approved') {
    throw new Error('Application already approved');
  }

  const membershipId = generateMembershipId();

  // Generate poster
  const userDetails = {
    fullName: application.fullName,
    district: application.district,
    profilePhoto: application.profilePhoto,
    batchName: application.batch ? application.batch.batchName : null,
  };

  const posterUrl = await generatePoster(userDetails, membershipId);

  // Update statuses
  application.membershipStatus = 'approved';
  application.membershipId = membershipId;
  application.posterUrl = posterUrl;
  application.posterGenerated = true;
  application.approvedBy = adminId;
  application.approvedAt = new Date();

  // Send Email with Nodemailer
  let emailSent = false;
  try {
    emailSent = await sendPosterEmail(application.email, application.fullName, posterUrl);
    application.emailSent = emailSent;
  } catch (err) {
    console.error('Error sending email:', err.message);
  }

  await application.save();

  // Activity Logs
  await ActivityLog.create({
    user: application._id,
    action: 'APPLICATION_APPROVED',
    performedBy: adminId,
    metadata: { membershipId },
  });

  await ActivityLog.create({
    user: application._id,
    action: 'POSTER_GENERATED',
    performedBy: adminId,
    metadata: { posterUrl },
  });

  if (emailSent) {
    await ActivityLog.create({
      user: application._id,
      action: 'EMAIL_SENT',
      performedBy: adminId,
      metadata: { email: application.email },
    });
  }

  return application;
};

const rejectApplication = async (id, adminId) => {
  const application = await MembershipApplication.findById(id);
  if (!application) {
    throw new Error('Application not found');
  }

  application.membershipStatus = 'rejected';
  await application.save();

  await ActivityLog.create({
    user: application._id,
    action: 'APPLICATION_REJECTED',
    performedBy: adminId,
    metadata: { applicationId: id },
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
