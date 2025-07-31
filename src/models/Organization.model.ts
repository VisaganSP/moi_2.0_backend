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
  // Updated subscription field with flexible max_functions
  subscription: {
    subscription_plan: {
      type: String,
      enum: ['basic', 'standard', 'premium'],
      default: 'basic'
    },
    max_functions: {
      type: Number,
      default: 10, // Default but fully customizable
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

// Add index for efficient queries
OrganizationSchema.index({ org_name: 1 });
OrganizationSchema.index({ org_id: 1 });
OrganizationSchema.index({ 'subscription.subscription_plan': 1 });

// Note: Removed the restrictive pre-save middleware that enforced plan limits
// max_functions is now fully flexible and can be set to any value by superadmins

export default mongoose.model('Organization', OrganizationSchema);