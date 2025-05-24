import { Types } from 'mongoose';

export interface EditLogInput {
  target_id: Types.ObjectId | string;
  target_type: 'Function' | 'Payer';
  action: 'update' | 'delete' | 'restore';
  before_value: any;
  after_value: any;
  reason: string;
  changed_fields?: string[];
  user_email: string;
  user_name: string;
}

export interface EditLogFilters {
  target_id?: string;
  target_type?: 'Function' | 'Payer';
  action?: 'update' | 'delete' | 'restore';
  created_by?: string;
  user_email?: string;
  startDate?: Date | string;
  endDate?: Date | string;
  page?: number;
  limit?: number;
}

export interface EditLogResponse {
  _id: string;
  target_id: string;
  target_type: 'Function' | 'Payer';
  action: 'update' | 'delete' | 'restore';
  before_value: any;
  after_value: any;
  reason: string;
  changed_fields: string[];
  created_by: string;
  user_email: string;
  user_name: string;
  created_at: Date;
}