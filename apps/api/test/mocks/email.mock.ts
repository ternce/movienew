/**
 * Email Service Mock
 *
 * Mock implementation of EmailService for testing.
 * Records all email sending attempts for verification.
 */

export interface MockEmailRecord {
  to: string;
  subject: string;
  template: string;
  context: Record<string, any>;
  timestamp: Date;
}

export class MockEmailService {
  private sentEmails: MockEmailRecord[] = [];
  private shouldFail = false;
  private failError: Error | null = null;

  /**
   * Reset all state
   */
  reset(): void {
    this.sentEmails = [];
    this.shouldFail = false;
    this.failError = null;
  }

  /**
   * Configure mock to fail on next call
   */
  setFailure(error?: Error): void {
    this.shouldFail = true;
    this.failError = error || new Error('Mock email service failure');
  }

  /**
   * Get all sent emails
   */
  getSentEmails(): MockEmailRecord[] {
    return [...this.sentEmails];
  }

  /**
   * Get emails sent to specific address
   */
  getEmailsTo(email: string): MockEmailRecord[] {
    return this.sentEmails.filter((e) => e.to === email);
  }

  /**
   * Get the last sent email
   */
  getLastEmail(): MockEmailRecord | undefined {
    return this.sentEmails[this.sentEmails.length - 1];
  }

  /**
   * Check if any email was sent to an address
   */
  wasSentTo(email: string): boolean {
    return this.sentEmails.some((e) => e.to === email);
  }

  /**
   * Check if email with specific template was sent
   */
  wasSentWithTemplate(template: string): boolean {
    return this.sentEmails.some((e) => e.template === template);
  }

  /**
   * Clear all sent emails
   */
  clear(): void {
    this.sentEmails = [];
  }

  // ============================================
  // Mock Service Methods
  // ============================================

  async sendWelcomeEmail(email: string, firstName: string): Promise<void> {
    if (this.shouldFail) {
      this.shouldFail = false;
      throw this.failError;
    }

    this.sentEmails.push({
      to: email,
      subject: 'Welcome to MoviePlatform',
      template: 'welcome',
      context: { firstName },
      timestamp: new Date(),
    });
  }

  async sendEmailVerification(
    email: string,
    firstName: string,
    token: string,
  ): Promise<void> {
    if (this.shouldFail) {
      this.shouldFail = false;
      throw this.failError;
    }

    this.sentEmails.push({
      to: email,
      subject: 'Verify your email',
      template: 'email-verification',
      context: { firstName, token },
      timestamp: new Date(),
    });
  }

  async sendPasswordResetEmail(
    email: string,
    firstName: string,
    token: string,
  ): Promise<void> {
    if (this.shouldFail) {
      this.shouldFail = false;
      throw this.failError;
    }

    this.sentEmails.push({
      to: email,
      subject: 'Reset your password',
      template: 'password-reset',
      context: { firstName, token },
      timestamp: new Date(),
    });
  }

  async sendLoginNotification(
    email: string,
    firstName: string,
    loginInfo: { ipAddress: string; deviceInfo?: string; loginTime: Date },
  ): Promise<void> {
    if (this.shouldFail) {
      this.shouldFail = false;
      throw this.failError;
    }

    this.sentEmails.push({
      to: email,
      subject: 'New login detected',
      template: 'login-notification',
      context: { firstName, ...loginInfo },
      timestamp: new Date(),
    });
  }
}

/**
 * Create a fresh mock email service instance
 */
export function createMockEmailService(): MockEmailService {
  return new MockEmailService();
}

/**
 * Create Jest mock functions for EmailService
 */
export function createEmailServiceMock() {
  const mockService = new MockEmailService();

  return {
    instance: mockService,
    sendWelcomeEmail: jest
      .fn()
      .mockImplementation((email, firstName) =>
        mockService.sendWelcomeEmail(email, firstName),
      ),
    sendEmailVerification: jest
      .fn()
      .mockImplementation((email, firstName, token) =>
        mockService.sendEmailVerification(email, firstName, token),
      ),
    sendPasswordResetEmail: jest
      .fn()
      .mockImplementation((email, firstName, token) =>
        mockService.sendPasswordResetEmail(email, firstName, token),
      ),
    sendLoginNotification: jest
      .fn()
      .mockImplementation((email, firstName, loginInfo) =>
        mockService.sendLoginNotification(email, firstName, loginInfo),
      ),
  };
}

export default MockEmailService;
