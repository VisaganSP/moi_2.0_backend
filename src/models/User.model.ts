import mongoose, { Schema } from 'mongoose';
import bcrypt from 'bcryptjs';
import { UserDocument, ActiveSession } from '../types';

// Define the ActiveSession schema
const ActiveSessionSchema: Schema = new Schema({
  token: {
    type: String,
    required: true
  },
  device_info: {
    type: String,
    required: true
  },
  ip_address: {
    type: String,
    required: true
  },
  last_active: {
    type: Date,
    default: Date.now
  }
}, { _id: false }); // No need for separate ID for embedded document

const UserSchema: Schema = new Schema(
  {
    username: {
      type: String,
      required: [true, 'Please provide a username'],
      unique: true,
      trim: true,
      maxlength: [50, 'Username cannot be more than 50 characters']
    },
    email: {
      type: String,
      required: [true, 'Please provide an email'],
      unique: true,
      match: [
        /^[\w-\.]+@([\w-]+\.)+[\w-]{2,4}$/,
        'Please provide a valid email'
      ]
    },
    password: {
      type: String,
      required: [true, 'Please provide a password'],
      minlength: [6, 'Password must be at least 6 characters'],
      select: false
    },
    isAdmin: {
      type: Boolean,
      default: false
    },
    // New fields for multi-tenant architecture
    isSuperAdmin: {
      type: Boolean,
      default: false
    },
    org_id: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Organization',
      required: [true, 'Organization ID is required']
    },
    org_name: {
      type: String,
      required: [true, 'Organization name is required'],
      trim: true
    },
    // For one-user-one-session functionality
    active_session: {
      type: ActiveSessionSchema,
      default: null
    }
  },
  { timestamps: true }
);

// Compound index for org_name + email to ensure uniqueness per organization
UserSchema.index({ org_name: 1, email: 1 }, { unique: true });

// Hash password before saving
UserSchema.pre<UserDocument>('save', async function (next) {
  if (!this.isModified('password')) {
    next();
    return;
  }

  const salt = await bcrypt.genSalt(10);
  this.password = await bcrypt.hash(this.password, salt);
  next();
});

// Method to compare entered password with hashed password
UserSchema.methods.matchPassword = async function (
  enteredPassword: string
): Promise<boolean> {
  return await bcrypt.compare(enteredPassword, this.password);
};

const User = mongoose.model<UserDocument>('User', UserSchema);

export default User;