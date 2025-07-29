import { Request } from 'express';
import { Document, Types } from 'mongoose';

// Add interface for active session
export interface ActiveSession {
  token: string;
  device_info: string;
  ip_address: string;
  last_active: Date;
}

export interface SecurityQuestion {
  _id?: string;
  question: string;
  answer: string;
}

export interface UserDocument extends Document {
  username: string;
  email: string;
  password: string;
  isAdmin: boolean;
  isSuperAdmin: boolean; // Added for superadmin role
  org_id: Types.ObjectId; // Added for multi-tenancy
  org_name: string; // Added for multi-tenancy
  active_session?: ActiveSession; // Added for session tracking
  security_questions: SecurityQuestion[];
  createdAt: Date;
  updatedAt: Date;
  matchPassword(enteredPassword: string): Promise<boolean>;
}

export interface AuthenticatedRequest extends Request {
  user?: UserDocument;
  organization?: OrganizationDocument; // Added for multi-tenancy
}

// Added for organization management
export interface OrganizationDocument extends Document {
  org_id: string;
  org_name: string;
  display_name: string;
  settings: {
    logo_url?: string;
    primary_color?: string;
    allow_multiple_sessions: boolean;
    session_timeout_minutes: number;
  };
  created_by?: Types.ObjectId;
  created_at: Date;
  updated_at: Date;
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
  org_id?: Types.ObjectId; // Added for multi-tenancy
  org_name?: string; // Added for multi-tenancy
  is_deleted: boolean;
  deleted_at?: Date;
  created_at: Date;
  updated_at: Date;
}

interface SearchParams {
  searchParam: string;
  searchQuery: string;
  page?: string;
  limit?: string;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
  searchType?: 'partial' | 'exact' | 'fuzzy' | 'startsWith' | 'endsWith';
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
  org_id?: Types.ObjectId; // Added for multi-tenancy
  org_name?: string; // Added for multi-tenancy
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
  org_id?: Types.ObjectId; // Added for multi-tenancy
  org_name?: string; // Added for multi-tenancy
  functions_contributed: Array<{
    function_id: Types.ObjectId;
    function_name: string;
    contribution_date: Date;
    amount: number;
  }>;
  last_updated: Date;
}

// Updated EditLog document interface
export interface EditLogDocument extends Document {
  target_id: Types.ObjectId;
  target_type: 'Function' | 'Payer' | 'Organization' | 'User'; // Added Organization and User
  action: 'update' | 'delete' | 'restore' | 'promote_to_superadmin' | 'demote_from_superadmin'; // Added superadmin actions
  before_value: any;
  after_value: any;
  reason: string;
  changed_fields: string[];
  created_by: Types.ObjectId;
  user_email: string;
  user_name: string;
  org_id?: Types.ObjectId; // Added for multi-tenancy
  org_name?: string; // Added for multi-tenancy
  created_at: Date;
}

// Added for organization search
export interface OrganizationSearchParams extends SearchParams {
  created_by?: string;
}

// Added for bulk operations on organizations
export interface BulkOperationResult {
  processed: string[];
  notFound: string[];
  count: number;
}