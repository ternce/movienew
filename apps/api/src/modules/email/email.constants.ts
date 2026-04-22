export const EMAIL_QUEUE = 'email';

export enum EmailJobType {
  SEND_EMAIL = 'send-email',
}

export const EMAIL_TEMPLATES = {
  WELCOME: 'welcome',
  EMAIL_VERIFICATION: 'email-verification',
  PASSWORD_RESET: 'password-reset',
  LOGIN_NOTIFICATION: 'login-notification',
  SUBSCRIPTION_EXPIRING: 'subscription-expiring',
  SUBSCRIPTION_EXPIRED: 'subscription-expired',
  SUBSCRIPTION_RENEWED: 'subscription-renewed',
  SUBSCRIPTION_RENEWAL_FAILED: 'subscription-renewal-failed',
  PAYMENT_SUCCESSFUL: 'payment-successful',
  PAYMENT_FAILED: 'payment-failed',
  REFUND_PROCESSED: 'refund-processed',
  EMAIL_CHANGE_CODE: 'email-change-code',
} as const;
