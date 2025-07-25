import mongoose, { Schema } from 'mongoose';
import { PayerDocument } from '../types';

// Define a nested schema for denominations WITHOUT default values
const DenominationSchema = new Schema({
  "2000": { type: Number },
  "500": { type: Number },
  "200": { type: Number },
  "100": { type: Number },
  "50": { type: Number },
  "20": { type: Number },
  "10": { type: Number },
  "5": { type: Number },
  "2": { type: Number },
  "1": { type: Number }
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
      trim: true
    },
    payer_name: {
      type: String,
      required: [true, 'Payer name is required'],
      trim: true
    },
    payer_phno: {
      type: String,
      // Make sure there's no index: true here
      // No sparse declaration here
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
    // New fields for denomination tracking - NO default values
    denominations_received: {
      type: DenominationSchema
    },
    total_received: {
      type: Number,
      default: 0
    },
    denominations_returned: {
      type: DenominationSchema
    },
    total_returned: {
      type: Number,
      default: 0
    },
    net_amount: {
      type: Number,
      default: 0
    },
    // CHANGED: created_by now stores user email instead of ObjectId
    created_by: {
      type: String,
      required: [true, 'Creator email is required'],
      trim: true,
      lowercase: true,
      match: [/^\w+([.-]?\w+)*@\w+([.-]?\w+)*(\.\w{2,3})+$/, 'Please enter a valid email']
    },
    // NEW: Optional field to store creator's name for display purposes
    created_by_name: {
      type: String,
      trim: true
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

// ONLY DEFINE THE COMPOUND INDEX
// Do NOT define a single-field index on payer_phno
// PayerSchema.index({ payer_phno: 1, function_id: 1 }, { unique: true, sparse: true });

// Pre-save middleware to calculate totals and validate amounts
PayerSchema.pre('save', function(this: any, next) {
  // Only calculate if this is a cash transaction
  if (this.payer_given_object === 'Cash') {
    // Check if denominations are actually provided with real values
    const hasReceivedDenoms = this.denominations_received && 
      typeof this.denominations_received === 'object' &&
      Object.keys(this.denominations_received).some(key => 
        this.denominations_received[key] !== undefined && 
        this.denominations_received[key] !== null && 
        this.denominations_received[key] > 0
      );
    
    const hasReturnedDenoms = this.denominations_returned && 
      typeof this.denominations_returned === 'object' &&
      Object.keys(this.denominations_returned).some(key => 
        this.denominations_returned[key] !== undefined && 
        this.denominations_returned[key] !== null && 
        this.denominations_returned[key] > 0
      );
    
    // Only perform denomination calculations if denominations are provided
    if (hasReceivedDenoms || hasReturnedDenoms) {
      // Calculate total received
      this.total_received = 0;
      if (this.denominations_received) {
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
      }
      
      // Calculate total returned
      this.total_returned = 0;
      if (this.denominations_returned) {
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
      }
      
      // Calculate net amount
      this.net_amount = this.total_received - this.total_returned;
      
      // Validate that net_amount matches payer_amount if both are provided
      if (this.payer_amount !== undefined && 
          this.payer_amount !== null && 
          this.net_amount !== this.payer_amount) {
        return next(new Error('Net amount from denominations does not match payer amount'));
      }
    } else {
      // No denominations provided - use payer_amount directly for cash transactions
      if (this.payer_amount !== undefined && this.payer_amount !== null) {
        this.net_amount = this.payer_amount;
        this.total_received = this.payer_amount;
        this.total_returned = 0;
      }
    }
  }
  
  next();
});

// CREATE THE MODEL AFTER DEFINING INDEXES
const Payer = mongoose.model<PayerDocument>('Payer', PayerSchema);

export default Payer;