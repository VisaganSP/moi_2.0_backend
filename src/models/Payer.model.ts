import mongoose, { Schema } from 'mongoose';
import { PayerDocument } from '../types';

// Define a nested schema for denominations
const DenominationSchema = new Schema({
  "2000": { type: Number, default: 0 },
  "500": { type: Number, default: 0 },
  "200": { type: Number, default: 0 },
  "100": { type: Number, default: 0 },
  "50": { type: Number, default: 0 },
  "20": { type: Number, default: 0 },
  "10": { type: Number, default: 0 },
  "5": { type: Number, default: 0 },
  "2": { type: Number, default: 0 },
  "1": { type: Number, default: 0 }
}, { _id: false });

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
    // New fields for denomination tracking
    denominations_received: {
      type: DenominationSchema,
      default: () => ({})
    },
    total_received: {
      type: Number,
      default: 0
    },
    denominations_returned: {
      type: DenominationSchema,
      default: () => ({})
    },
    total_returned: {
      type: Number,
      default: 0
    },
    net_amount: {
      type: Number,
      default: 0
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

// Pre-save middleware to calculate totals and validate amounts
PayerSchema.pre('save', function(this: any, next) {
  // Only calculate if this is a cash transaction
  if (this.payer_given_object === 'Cash') {
    // Calculate total received
    this.total_received = 
      (this.denominations_received['2000'] || 0) * 2000 +
      (this.denominations_received['500'] || 0) * 500 +
      (this.denominations_received['200'] || 0) * 200 +
      (this.denominations_received['100'] || 0) * 100 +
      (this.denominations_received['50'] || 0) * 50 +
      (this.denominations_received['20'] || 0) * 20 +
      (this.denominations_received['10'] || 0) * 10 +
      (this.denominations_received['5'] || 0) * 5 +
      (this.denominations_received['2'] || 0) * 2 +
      (this.denominations_received['1'] || 0) * 1;
    
    // Calculate total returned
    this.total_returned = 
      (this.denominations_returned['2000'] || 0) * 2000 +
      (this.denominations_returned['500'] || 0) * 500 +
      (this.denominations_returned['200'] || 0) * 200 +
      (this.denominations_returned['100'] || 0) * 100 +
      (this.denominations_returned['50'] || 0) * 50 +
      (this.denominations_returned['20'] || 0) * 20 +
      (this.denominations_returned['10'] || 0) * 10 +
      (this.denominations_returned['5'] || 0) * 5 +
      (this.denominations_returned['2'] || 0) * 2 +
      (this.denominations_returned['1'] || 0) * 1;
    
    // Calculate net amount
    this.net_amount = this.total_received - this.total_returned;
    
    // Validate that net_amount matches payer_amount
    if (this.payer_amount !== undefined && this.payer_amount !== null && this.net_amount !== this.payer_amount) {
      return next(new Error('Net amount from denominations does not match payer amount'));
    }
  }
  
  next();
});

const Payer = mongoose.model<PayerDocument>('Payer', PayerSchema);

export default Payer;