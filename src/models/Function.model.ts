import mongoose, { Schema } from 'mongoose';
import { FunctionDocument } from '../types';

const FunctionSchema: Schema = new Schema(
  {
    function_name: {
      type: String,
      required: [true, 'Function name is required'],
      trim: true
    },
      function_id: {
      type: String,
      unique: true, // Ensure uniqueness
      required: true
    },
    function_owner_name: {
      type: String,
      required: [true, 'Owner name is required'],
      trim: true
    },
    function_owner_city: {
      type: String,
      required: [true, 'Owner city is required'],
      trim: true
    },
    function_owner_address: {
      type: String,
      // required: [true, 'Owner address is required'],
      trim: true
    },
    function_owner_phno: {
      type: String,
      required: [true, 'Owner phone number is required'],
      trim: true
    },
    function_amt_spent: {
      type: Number,
      // required: [true, 'Amount spent is required'],
      min: [0, 'Amount cannot be negative']
    },
    function_hero_name: {
      type: String,
      trim: true
    },
    function_heroine_name: {
      type: String,
      trim: true
    },
    function_held_place: {
      type: String,
      required: [true, 'Function place is required'],
      trim: true
    },
    function_held_city: {
      type: String,
      required: [true, 'Function city is required'],
      trim: true
    },
    function_start_date: {
      type: Date,
      required: [true, 'Start date is required']
    },
    function_start_time: {
      type: String,
      required: [true, 'Start time is required'],
      trim: true
    },
    function_end_date: {
      type: Date,
      required: [true, 'End date is required']
    },
    function_end_time: {
      type: String,
      required: [true, 'End time is required'],
      trim: true
    },
    function_total_days: {
      type: Number,
      // required: [true, 'Total days is required'],
      min: [1, 'Total days must be at least 1']
    },
    function_bill_details: {
      owner_name: {
        type: String,
        trim: true
      },
      owner_occupation: {
        type: String,
        trim: true
      },
      wife_name: {
        type: String,
        trim: true
      },
      wife_occupation: {
        type: String,
        trim: true
      },
      function_place: {
        type: String,
        trim: true
      },
      function_city: {
        type: String,
        trim: true
      }
    },
    created_by: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true
    },
    is_deleted: {
      type: Boolean,
      default: false
    },
    deleted_at: {
      type: Date
    }
  },
  {
    timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' }
  }
);

const Function = mongoose.model<FunctionDocument>('Function', FunctionSchema);

export default Function;