import mongoose from 'mongoose';

const OrganizationSchema = new mongoose.Schema({
  org_id: {
    type: String,
    required: true,
    unique: true,
    trim: true
  },
  org_name: {
    type: String,
    required: true,
    unique: true,
    trim: true,
    lowercase: true,
    match: [/^[a-z0-9_]+$/, 'Organization name can only contain lowercase letters, numbers, and underscores']
  },
  display_name: {
    type: String,
    required: true,
    trim: true
  },
  settings: {
    logo_url: String,
    primary_color: String,
    allow_multiple_sessions: {
      type: Boolean,
      default: false
    },
    session_timeout_minutes: {
      type: Number,
      default: 60 // 1 hour
    }
  },
  // New subscription field for function limits
  subscription: {
    max_functions: {
      type: Number,
      default: 10, // Default limit is 10 functions
      min: 0
    },
    functions_created: {
      type: Number,
      default: 0,
      min: 0
    },
    last_updated: {
      type: Date,
      default: Date.now
    },
    updated_by: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    }
  },
  created_at: {
    type: Date,
    default: Date.now
  },
  updated_at: {
    type: Date,
    default: Date.now
  }
});

export default mongoose.model('Organization', OrganizationSchema);