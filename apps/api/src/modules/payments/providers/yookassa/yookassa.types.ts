/**
 * YooKassa API types for mock implementation.
 */

export interface YooKassaPaymentRequest {
  amount: {
    value: string;
    currency: string;
  };
  capture: boolean;
  confirmation: {
    type: 'redirect';
    return_url: string;
  };
  description?: string;
  metadata?: Record<string, any>;
}

export interface YooKassaPaymentResponse {
  id: string;
  status: 'pending' | 'waiting_for_capture' | 'succeeded' | 'canceled';
  paid: boolean;
  amount: {
    value: string;
    currency: string;
  };
  confirmation?: {
    type: 'redirect';
    confirmation_url: string;
  };
  created_at: string;
  description?: string;
  metadata?: Record<string, any>;
  refundable?: boolean;
}

export interface YooKassaRefundRequest {
  payment_id: string;
  amount: {
    value: string;
    currency: string;
  };
  description?: string;
}

export interface YooKassaRefundResponse {
  id: string;
  status: 'pending' | 'succeeded' | 'canceled';
  amount: {
    value: string;
    currency: string;
  };
  payment_id: string;
  created_at: string;
  description?: string;
}

export interface YooKassaConfig {
  shopId: string;
  secretKey: string;
  returnUrl: string;
  webhookSecret: string;
  isMockMode: boolean;
}
