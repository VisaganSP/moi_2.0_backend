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
      },
      
      // NEW: Logo image stored as base64 string
      logo_image: { 
        type: String,
        validate: {
          validator: function(v: string): boolean {
            if (!v) return true; // Allow empty values
            // Validate base64 image format
            return /^data:image\/(jpeg|jpg|png|gif);base64,/.test(v);
          },
          message: 'Logo image must be a valid base64 encoded image (JPEG, PNG, or GIF)'
        }
      },
      
      // NEW: Advertisement settings
      advertisement_settings: {
        ad_title: { 
          type: String, 
          default: 'MOITECH',
          trim: true,
          maxlength: [100, 'Advertisement title cannot exceed 100 characters']
        },
        ad_subtitle: { 
          type: String, 
          default: 'For all your tech needs',
          trim: true,
          maxlength: [200, 'Advertisement subtitle cannot exceed 200 characters']
        },
        ad_phone: { 
          type: String, 
          default: '7339124748, 9894454345',
          trim: true,
          maxlength: [100, 'Advertisement phone cannot exceed 100 characters']
        }
      },
      
      // NEW: Font settings with validation
      font_settings: {
        base_font_size: { 
          type: Number, 
          default: 12,
          min: [8, 'Base font size cannot be less than 8px'],
          max: [20, 'Base font size cannot exceed 20px']
        },
        company_name_size: { 
          type: Number, 
          default: 14,
          min: [10, 'Company name font size cannot be less than 10px'],
          max: [24, 'Company name font size cannot exceed 24px']
        },
        header_size: { 
          type: Number, 
          default: 12,
          min: [8, 'Header font size cannot be less than 8px'],
          max: [18, 'Header font size cannot exceed 18px']
        },
        customer_name_size: { 
          type: Number, 
          default: 16,
          min: [10, 'Customer name font size cannot be less than 10px'],
          max: [22, 'Customer name font size cannot exceed 22px']
        },
        amount_size: { 
          type: Number, 
          default: 18,
          min: [12, 'Amount font size cannot be less than 12px'],
          max: [24, 'Amount font size cannot exceed 24px']
        }
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