import mongoose, { Schema } from 'mongoose';
import { EditLogDocument } from '../types';

const EditLogSchema: Schema = new Schema({
  target_id: {
    type: mongoose.Schema.Types.ObjectId,
    required: true,
    refPath: 'target_type'
  },
  target_type: {
    type: String,
    required: true,
    enum: ['Function', 'Payer']
  },
  action: {
    type: String,
    required: true,
    enum: ['update', 'delete', 'restore']
  },
  before_value: {
    type: mongoose.Schema.Types.Mixed,
    required: true
  },
  after_value: {
    type: mongoose.Schema.Types.Mixed,
    required: true
  },
  reason: {
    type: String,
    required: true
  },
  changed_fields: {
    type: [String],
    default: []
  },
  created_by: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  user_email: {
    type: String,
    required: true
  },
  user_name: {
    type: String,
    required: true
  },
  created_at: {
    type: Date,
    default: Date.now
  }
});

// Create index for faster queries
EditLogSchema.index({ target_id: 1, target_type: 1 });
EditLogSchema.index({ created_by: 1 });
EditLogSchema.index({ created_at: -1 });

const EditLog = mongoose.model<EditLogDocument>('EditLog', EditLogSchema);

export default EditLog;