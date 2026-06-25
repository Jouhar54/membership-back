import mongoose from 'mongoose';

const membershipApplicationSchema = new mongoose.Schema({
  fullName: {
    type: String,
    required: true,
    uppercase: true,
    trim: true,
  },
  email: {
    type: String,
    required: true,
    unique: true,
    trim: true,
    lowercase: true,
  },
  phone: {
    type: String,
    required: true,
    unique: true,
    trim: true,
  },
  district: {
    type: String,
    trim: true,
  },
  batch: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Batch',
    required: true,
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
}, { timestamps: true });

export default mongoose.model('MembershipApplication', membershipApplicationSchema);
