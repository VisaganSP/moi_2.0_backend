// Visualization Types
export interface PaymentMethodDistribution {
  payment_method: string;
  count: number;
  total_amount: number;
}

export interface RelationDistribution {
  relation: string;
  count: number;
  total_amount: number;
  average_amount: number;
}

export interface CityDistribution {
  city: string;
  count: number;
  total_amount: number;
}

export interface AmountRangeDistribution {
  range: string;
  count: number;
  total_amount: number;
}

export interface GiftType {
  gift_name: string;
  count: number;
}

export interface CashVsGiftsComparison {
  cash: {
    count: number;
    total_amount: number;
  };
  gifts: {
    count: number;
    gift_types: GiftType[];
  };
}

export interface TopContributor {
  _id: string;
  payer_name: string;
  payer_relation: string;
  payer_city: string;
  payer_amount: number;
  payer_given_object: string;
  payer_gift_name?: string;
}

// Response Interfaces
export interface ApiResponse<T> {
  success: boolean;
  data: T;
}