import mongoose from 'mongoose';

const membershipApplicationSchema = new mongoose.Schema({
  fullName: {
    type: String,
    required: true,
    uppercase: true,
    trim: true,
  },
  fatherName: {
    type: String,
    trim: true,
  },
  dob: {
    type: String,
    trim: true,
  },
  bloodGroup: {
    type: String,
    trim: true,
  },
  houseName: {
    type: String,
    trim: true,
  },
  place: {
    type: String,
    trim: true,
  },
  post: {
    type: String,
    trim: true,
  },
  pin: {
    type: String,
    trim: true,
  },
  whatsapp: {
    type: String,
    trim: true,
  },
  phone: {
    type: String,
    required: true,
    unique: true,
    trim: true,
  },
  email: {
    type: String,
    required: true,
    unique: true,
    trim: true,
    lowercase: true,
  },
  batch: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Batch',
    required: true,
  },
  district: {
    type: String,
    trim: true,
  },
  state: {
    type: String,
    trim: true,
    default: 'Kerala',
  },
  panchayath: {
    type: String,
    trim: true,
  },
  mandalam: {
    type: String,
    trim: true,
  },
  thaluk: {
    type: String,
    trim: true,
  },
  jobType: {
    type: String,
    trim: true,
  },
  jobTypeOther: {
    type: String,
    trim: true,
  },
  declarationAccepted: {
    type: Boolean,
    default: false,
  },
  declarationDate: {
    type: String,
    trim: true,
  },
  signature: {
    type: String, // Cloudinary URL
  },
  profilePhoto: {
    type: String, // Cloudinary URL
  },
  paymentStatus: {
    type: String,
    enum: ['pending', 'paid'],
    default: 'pending',
  },
  membershipStatus: {
    type: String,
    enum: ['pending', 'approved', 'rejected'],
    default: 'pending',
  },
  membershipId: {
    type: String,
    trim: true,
  },
  posterUrl: {
    type: String,
  },
  posterGenerated: {
    type: Boolean,
    default: false,
  },
  emailSent: {
    type: Boolean,
    default: false,
  },
  approvedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
  },
  approvedAt: {
    type: Date,
  },
  rejectedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
  },
  rejectionReason: {
    type: String,
    trim: true,
  },
  rejectedAt: {
    type: Date,
  },
}, { timestamps: true });

export default mongoose.model('MembershipApplication', membershipApplicationSchema);
