import mongoose from 'mongoose';

const activityLogSchema = new mongoose.Schema({
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User', // User who is the subject of the action (optional)
  },
  action: {
    type: String,
    required: true,
  },
  performedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
  },
  metadata: {
    type: mongoose.Schema.Types.Mixed, // flexible data
  },
}, { timestamps: true });

export default mongoose.model('ActivityLog', activityLogSchema);
