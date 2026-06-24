import mongoose from 'mongoose';

const membershipSchema = new mongoose.Schema({
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
  },
  batch: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Batch',
    required: true,
  },
  amount: {
    type: Number,
    default: 200,
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
  approvedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
  },
  approvedAt: {
    type: Date,
  },
  membershipId: {
    type: String,
    unique: true,
    sparse: true, // sparse allows multiple nulls if it's pending
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
}, { timestamps: true });

export default mongoose.model('Membership', membershipSchema);
