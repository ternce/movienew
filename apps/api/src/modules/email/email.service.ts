import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectQueue } from '@nestjs/bull';
import { Queue } from 'bull';
import { EMAIL_QUEUE, EmailJobType, EMAIL_TEMPLATES } from './email.constants';

export interface EmailContext {
  [key: string]: unknown;
}

export interface SendEmailOptions {
  to: string;
  subject: string;
  template: string;
  context: EmailContext;
  priority?: 'high' | 'normal' | 'low';
}

export interface LoginInfo {
  ipAddress: string;
  deviceInfo?: string;
  loginTime: Date;
  location?: string;
}

@Injectable()
export class EmailService {
  private readonly logger = new Logger(EmailService.name);
  private readonly appUrl: string;
  private readonly appName: string;
  private readonly supportEmail: string;

  constructor(
    @InjectQueue(EMAIL_QUEUE) private readonly emailQueue: Queue,
    private readonly configService: ConfigService,
  ) {
    this.appUrl = this.configService.get<string>('APP_URL', 'http://localhost:3000');
    this.appName = this.configService.get<string>('APP_NAME', 'MoviePlatform');
    this.supportEmail = this.configService.get<string>('SUPPORT_EMAIL', 'support@movieplatform.ru');
  }

  /**
   * Send welcome email to new user.
   */
  async sendWelcomeEmail(email: string, firstName: string): Promise<void> {
    await this.queueEmail({
      to: email,
      subject: `Добро пожаловать в ${this.appName}!`,
      template: EMAIL_TEMPLATES.WELCOME,
      context: {
        firstName,
        appName: this.appName,
        appUrl: this.appUrl,
        loginUrl: `${this.appUrl}/login`,
        supportEmail: this.supportEmail,
        year: new Date().getFullYear(),
      },
    });
  }

  /**
   * Send email verification link.
   */
  async sendEmailVerification(
    email: string,
    firstName: string,
    token: string,
  ): Promise<void> {
    const verificationUrl = `${this.appUrl}/verify-email?token=${token}`;

    await this.queueEmail({
      to: email,
      subject: 'Подтвердите ваш email',
      template: EMAIL_TEMPLATES.EMAIL_VERIFICATION,
      context: {
        firstName,
        appName: this.appName,
        verificationUrl,
        expiresIn: '24 часа',
        supportEmail: this.supportEmail,
        year: new Date().getFullYear(),
      },
      priority: 'high',
    });
  }

  /**
   * Send password reset link.
   */
  async sendPasswordResetEmail(
    email: string,
    firstName: string,
    token: string,
  ): Promise<void> {
    const resetUrl = `${this.appUrl}/reset-password?token=${token}`;

    await this.queueEmail({
      to: email,
      subject: 'Сброс пароля',
      template: EMAIL_TEMPLATES.PASSWORD_RESET,
      context: {
        firstName,
        appName: this.appName,
        resetUrl,
        expiresIn: '1 час',
        supportEmail: this.supportEmail,
        year: new Date().getFullYear(),
      },
      priority: 'high',
    });
  }

  /**
   * Send login notification for security awareness.
   */
  async sendLoginNotification(
    email: string,
    firstName: string,
    loginInfo: LoginInfo,
  ): Promise<void> {
    await this.queueEmail({
      to: email,
      subject: 'Новый вход в аккаунт',
      template: EMAIL_TEMPLATES.LOGIN_NOTIFICATION,
      context: {
        firstName,
        appName: this.appName,
        ipAddress: loginInfo.ipAddress,
        deviceInfo: loginInfo.deviceInfo || 'Неизвестное устройство',
        loginTime: loginInfo.loginTime.toLocaleString('ru-RU', {
          timeZone: 'Europe/Moscow',
          dateStyle: 'long',
          timeStyle: 'short',
        }),
        location: loginInfo.location || 'Неизвестная локация',
        securitySettingsUrl: `${this.appUrl}/settings/security`,
        supportEmail: this.supportEmail,
        year: new Date().getFullYear(),
      },
    });
  }

  /**
   * Send subscription expiring warning email.
   */
  async sendSubscriptionExpiringEmail(
    email: string,
    firstName: string,
    planName: string,
    daysRemaining: number,
    expiresAt: Date,
    subscriptionId: string,
  ): Promise<void> {
    const urgency = daysRemaining <= 1 ? 'high' : 'normal';
    const subject = daysRemaining <= 1
      ? `Ваша подписка истекает завтра!`
      : `Ваша подписка истекает через ${daysRemaining} дней`;

    await this.queueEmail({
      to: email,
      subject,
      template: EMAIL_TEMPLATES.SUBSCRIPTION_EXPIRING,
      context: {
        firstName,
        appName: this.appName,
        planName,
        daysRemaining,
        expiresAt: expiresAt.toLocaleDateString('ru-RU', {
          timeZone: 'Europe/Moscow',
          dateStyle: 'long',
        }),
        subscriptionUrl: `${this.appUrl}/account/subscriptions`,
        renewUrl: `${this.appUrl}/account/subscriptions/${subscriptionId}/renew`,
        supportEmail: this.supportEmail,
        year: new Date().getFullYear(),
      },
      priority: urgency,
    });
  }

  /**
   * Send subscription expired notification email.
   */
  async sendSubscriptionExpiredEmail(
    email: string,
    firstName: string,
    planName: string,
  ): Promise<void> {
    await this.queueEmail({
      to: email,
      subject: 'Ваша подписка истекла',
      template: EMAIL_TEMPLATES.SUBSCRIPTION_EXPIRED,
      context: {
        firstName,
        appName: this.appName,
        planName,
        renewUrl: `${this.appUrl}/pricing`,
        supportEmail: this.supportEmail,
        year: new Date().getFullYear(),
      },
    });
  }

  /**
   * Send subscription renewed confirmation email.
   */
  async sendSubscriptionRenewedEmail(
    email: string,
    firstName: string,
    planName: string,
    newExpiresAt: Date,
    amount: number,
  ): Promise<void> {
    await this.queueEmail({
      to: email,
      subject: 'Ваша подписка продлена',
      template: EMAIL_TEMPLATES.SUBSCRIPTION_RENEWED,
      context: {
        firstName,
        appName: this.appName,
        planName,
        newExpiresAt: newExpiresAt.toLocaleDateString('ru-RU', {
          timeZone: 'Europe/Moscow',
          dateStyle: 'long',
        }),
        amount: `${amount} ₽`,
        subscriptionUrl: `${this.appUrl}/account/subscriptions`,
        supportEmail: this.supportEmail,
        year: new Date().getFullYear(),
      },
    });
  }

  /**
   * Send subscription renewal failed notification email.
   */
  async sendSubscriptionRenewalFailedEmail(
    email: string,
    firstName: string,
    planName: string,
    expiresAt: Date,
    errorReason?: string,
  ): Promise<void> {
    await this.queueEmail({
      to: email,
      subject: 'Не удалось продлить подписку',
      template: EMAIL_TEMPLATES.SUBSCRIPTION_RENEWAL_FAILED,
      context: {
        firstName,
        appName: this.appName,
        planName,
        expiresAt: expiresAt.toLocaleDateString('ru-RU', {
          timeZone: 'Europe/Moscow',
          dateStyle: 'long',
        }),
        errorReason: errorReason || 'Ошибка при обработке платежа',
        paymentMethodsUrl: `${this.appUrl}/account/payment-methods`,
        renewUrl: `${this.appUrl}/pricing`,
        supportEmail: this.supportEmail,
        year: new Date().getFullYear(),
      },
      priority: 'high',
    });
  }

  /**
   * Send payment successful notification email.
   */
  async sendPaymentSuccessfulEmail(
    email: string,
    firstName: string,
    transactionId: string,
    amount: number,
    description: string,
  ): Promise<void> {
    await this.queueEmail({
      to: email,
      subject: 'Платёж успешно выполнен',
      template: EMAIL_TEMPLATES.PAYMENT_SUCCESSFUL,
      context: {
        firstName,
        appName: this.appName,
        transactionId,
        amount: `${amount} ₽`,
        description,
        historyUrl: `${this.appUrl}/account/payments`,
        supportEmail: this.supportEmail,
        year: new Date().getFullYear(),
      },
    });
  }

  /**
   * Send payment failed notification email.
   */
  async sendPaymentFailedEmail(
    email: string,
    firstName: string,
    amount: number,
    description: string,
    errorReason?: string,
  ): Promise<void> {
    await this.queueEmail({
      to: email,
      subject: 'Платёж не прошёл',
      template: EMAIL_TEMPLATES.PAYMENT_FAILED,
      context: {
        firstName,
        appName: this.appName,
        amount: `${amount} ₽`,
        description,
        errorReason: errorReason || 'Ошибка при обработке платежа',
        retryUrl: `${this.appUrl}/pricing`,
        supportEmail: this.supportEmail,
        year: new Date().getFullYear(),
      },
      priority: 'high',
    });
  }

  /**
   * Send refund processed notification email.
   */
  async sendRefundProcessedEmail(
    email: string,
    firstName: string,
    transactionId: string,
    amount: number,
    originalAmount: number,
  ): Promise<void> {
    const isPartial = amount < originalAmount;
    const subject = isPartial ? 'Частичный возврат выполнен' : 'Возврат средств выполнен';

    await this.queueEmail({
      to: email,
      subject,
      template: EMAIL_TEMPLATES.REFUND_PROCESSED,
      context: {
        firstName,
        appName: this.appName,
        transactionId,
        refundAmount: `${amount} ₽`,
        originalAmount: `${originalAmount} ₽`,
        isPartial,
        historyUrl: `${this.appUrl}/account/payments`,
        supportEmail: this.supportEmail,
        year: new Date().getFullYear(),
      },
    });
  }

  /**
   * Send email change OTP code.
   */
  async sendEmailChangeCode(
    firstName: string,
    newEmail: string,
    code: string,
  ): Promise<void> {
    await this.queueEmail({
      to: newEmail,
      subject: 'Подтверждение смены email',
      template: EMAIL_TEMPLATES.EMAIL_CHANGE_CODE,
      context: {
        firstName,
        newEmail,
        code,
        appName: this.appName,
        expiresIn: '10 минут',
        supportEmail: this.supportEmail,
        year: new Date().getFullYear(),
      },
      priority: 'high',
    });
  }

  /**
   * Queue email for async sending.
   */
  private async queueEmail(options: SendEmailOptions): Promise<void> {
    const priorityMap = {
      high: 1,
      normal: 5,
      low: 10,
    };

    try {
      await this.emailQueue.add(EmailJobType.SEND_EMAIL, options, {
        priority: priorityMap[options.priority || 'normal'],
      });
      this.logger.log(`Email queued: ${options.template} to ${options.to}`);
    } catch (error) {
      this.logger.error(
        `Failed to queue email: ${error instanceof Error ? error.message : 'Unknown error'}`,
        error instanceof Error ? error.stack : undefined,
      );
      throw error;
    }
  }
}
