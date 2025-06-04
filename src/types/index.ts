import { Request } from 'express';
import { Document, Types } from 'mongoose';

export interface UserDocument extends Document {
  username: string;
  email: string;
  password: string;
  isAdmin: boolean;
  createdAt: Date;
  updatedAt: Date;
  matchPassword(enteredPassword: string): Promise<boolean>;
}

export interface AuthenticatedRequest extends Request {
  user?: UserDocument;
}

export interface FunctionDocument extends Document {
  function_id: string;
  function_name: string;
  function_owner_name: string;
  function_owner_city: string;
  function_owner_address: string;
  function_owner_phno: string;
  function_amt_spent: number;
  function_hero_name: string;
  function_heroine_name: string;
  function_held_place: string;
  function_held_city: string;
  function_start_date: Date;
  function_start_time: string;
  function_end_date: Date;
  function_end_time: string;
  function_total_days: number;
  function_bill_details: {
    owner_name: string;
    owner_occupation: string;
    wife_name: string;
    wife_occupation: string;
    function_place: string;
    function_city: string;
  };
  created_by: Types.ObjectId;
  is_deleted: boolean;
  deleted_at?: Date;
  created_at: Date;
  updated_at: Date;
}

export interface DenominationCounts {
  "2000"?: number;
  "500"?: number;
  "200"?: number;
  "100"?: number;
  "50"?: number;
  "20"?: number;
  "10"?: number;
  "5"?: number;
  "2"?: number;
  "1"?: number;
}

export interface PayerDocument extends Document {
  function_id: string;
  function_name: string;
  payer_name: string;
  payer_phno: string;
  payer_work: string;
  payer_given_object: string;
  payer_cash_method: string;
  payer_amount: number;
  payer_gift_name: string;
  payer_relation: string;
  payer_city: string;
  payer_address: string;
  current_date: Date;
  current_time: string;
  // Denominations received and returned
  denominations_received: DenominationCounts;
  total_received: number;
  denominations_returned: DenominationCounts;
  total_returned: number;
  net_amount: number;
  created_by: Types.ObjectId;
  is_deleted: boolean;
  deleted_at?: Date;
  created_at: Date;
  updated_at: Date;
}

export interface PayerProfileDocument extends Document {
  payer_name: string;
  payer_phno: string;
  payer_work: string;
  payer_city: string;
  payer_address: string;
  functions_contributed: Array<{
    function_id: Types.ObjectId;
    function_name: string;
    contribution_date: Date;
    amount: number;
  }>;
  last_updated: Date;
}

// Add EditLog document interface
export interface EditLogDocument extends Document {
  target_id: Types.ObjectId;
  target_type: 'Function' | 'Payer';
  action: 'update' | 'delete' | 'restore';
  before_value: any;
  after_value: any;
  reason: string;
  changed_fields: string[];
  created_by: Types.ObjectId;
  user_email: string;
  user_name: string;
  created_at: Date;
}