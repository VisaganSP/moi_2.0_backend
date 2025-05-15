import mongoose, { Schema } from 'mongoose';
import { PayerProfileDocument } from '../types';

const PayerProfileSchema: Schema = new Schema(
  {
    payer_name: {
      type: String,
      required: [true, 'Payer name is required'],
      trim: true
    },
    payer_phno: {
      type: String,
      required: [true, 'Payer phone number is required'],
      trim: true,
      unique: true
    },
    payer_work: {
      type: String,
      trim: true
    },
    payer_city: {
      type: String,
      trim: true
    },
    payer_address: {
      type: String,
      trim: true
    },
    functions_contributed: [
      {
        function_id: {
          type: Schema.Types.ObjectId,
          ref: 'Function'
        },
        function_name: {
          type: String,
          trim: true
        },
        contribution_date: {
          type: Date
        },
        amount: {
          type: Number,
          min: [0, 'Amount cannot be negative']
        }
      }
    ],
    last_updated: {
      type: Date,
      default: Date.now
    }
  },
  { timestamps: true }
);

// Create index for fast phone number search
PayerProfileSchema.index({ payer_phno: 1 });

const PayerProfile = mongoose.model<PayerProfileDocument>(
  'PayerProfile',
  PayerProfileSchema
);

export default PayerProfile;