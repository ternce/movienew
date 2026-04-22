// Notification types
export enum NotificationType {
  EMAIL = 'EMAIL',
  PUSH = 'PUSH',
  IN_APP = 'IN_APP',
}

// Newsletter campaign status
export enum CampaignStatus {
  DRAFT = 'DRAFT',
  SCHEDULED = 'SCHEDULED',
  SENDING = 'SENDING',
  SENT = 'SENT',
  CANCELLED = 'CANCELLED',
}

// Notification template
export interface NotificationTemplate {
  id: string;
  name: string;
  type: NotificationType;
  subject?: string; // For emails
  bodyTemplate: string;
  variables: string[]; // e.g., ['userName', 'contentTitle']
}

// User notification
export interface UserNotification {
  id: string;
  userId: string;
  templateId?: string;
  title: string;
  body: string;
  data?: Record<string, unknown>;
  readAt?: Date;
  createdAt: Date;
}

// Newsletter campaign filters
export interface CampaignFilters {
  ageCategories?: string[];
  verificationStatus?: string[];
  subscriptionTypes?: string[];
  roles?: string[];
  hasActiveSubscription?: boolean;
  registeredAfter?: Date;
  registeredBefore?: Date;
}

// Newsletter campaign
export interface NewsletterCampaign {
  id: string;
  name: string;
  subject: string;
  body: string;
  filters: CampaignFilters;
  status: CampaignStatus;
  sentCount: number;
  scheduledAt?: Date;
  sentAt?: Date;
}

// Newsletter preferences
export interface NewsletterPreferences {
  userId: string;
  emailMarketing: boolean;
  emailUpdates: boolean;
  pushNotifications: boolean;
}
