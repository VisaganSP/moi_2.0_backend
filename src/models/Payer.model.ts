import mongoose, { Schema } from 'mongoose';
import { PayerDocument } from '../types';

const PayerSchema: Schema = new Schema(
  {
    function_id: {
      type: String,
      ref: 'Function',
      required: [true, 'Function ID is required']
    },
    function_name: {
      type: String,
      // required: [true, 'Function name is required'],
      trim: true
    },
    payer_name: {
      type: String,
      required: [true, 'Payer name is required'],
      trim: true
    },
    payer_phno: {
      type: String,
      unique: true,
      // required: [true, 'Payer phone number is required'],
      trim: true
    },
    payer_work: {
      type: String,
      trim: true
    },
    payer_given_object: {
      type: String,
      required: [true, 'Payer given object is required'],
      trim: true
    },
    payer_cash_method: {
      type: String,
      trim: true
    },
    payer_amount: {
      type: Number,
      // required: [true, 'Amount is required'],
      min: [0, 'Amount cannot be negative']
    },
    payer_gift_name: {
      type: String,
      trim: true
    },
    payer_relation: {
      type: String,
      trim: true
    },
    payer_city: {
      type: String,
      required: [true, 'Payer city is required'],
      trim: true
    },
    payer_address: {
      type: String,
      trim: true
    },
    current_date: {
      type: Date,
      default: Date.now
    },
    current_time: {
      type: String
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

const Payer = mongoose.model<PayerDocument>('Payer', PayerSchema);

export default Payer;