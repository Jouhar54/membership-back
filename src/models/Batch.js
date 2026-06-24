import mongoose from 'mongoose';

const batchSchema = new mongoose.Schema({
  batchName: {
    type: String,
    required: true,
    trim: true,
  },
  batchCode: {
    type: String,
    required: true,
    unique: true,
    trim: true,
    uppercase: true,
  },
  joinLink: {
    type: String,
    unique: true,
  },
  coordinators: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
  }],
  totalMembers: {
    type: Number,
    default: 0,
  },
}, { timestamps: true });

export default mongoose.model('Batch', batchSchema);
