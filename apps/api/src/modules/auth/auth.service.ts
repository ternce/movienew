import {
  Injectable,
  UnauthorizedException,
  ConflictException,
  BadRequestException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcrypt';
import { UserRole } from '@movie-platform/shared';
import { VerificationStatus } from '@prisma/client';

import { PrismaService } from '../../config/prisma.service';
import { UsersService } from '../users/users.service';
import { SessionService } from './session.service';
import { TokenService } from './token.service';
import { EmailService } from '../email/email.service';
import { RegisterDto, LoginResponseDto, RefreshResponseDto } from './dto';
import { getAgeCategory, isMinor } from '../users/utils/age.util';
import { generateReferralCode, normalizeReferralCode, isValidReferralCodeFormat } from '../users/utils/referral.util';

export interface JwtPayload {
  sub: string;
  email: string;
  role: string;
  ageCategory: string;
  verificationStatus: string;
}

export interface TokenResponse {
  accessToken: string;
  refreshToken: string;
  expiresIn: number;
}

@Injectable()
export class AuthService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly usersService: UsersService,
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService,
    private readonly sessionService: SessionService,
    private readonly tokenService: TokenService,
    private readonly emailService: EmailService,
  ) {}

  /**
   * Validate user credentials.
   */
  async validateUser(email: string, password: string) {
    const user = await this.usersService.findByEmail(email);
    if (!user) {
      throw new UnauthorizedException('Неверные учётные данные');
    }

    if (!user.isActive) {
      throw new UnauthorizedException('Аккаунт деактивирован');
    }

    const isPasswordValid = await bcrypt.compare(password, user.passwordHash);
    if (!isPasswordValid) {
      throw new UnauthorizedException('Неверные учётные данные');
    }

    return user;
  }

  /**
   * Register a new user.
   */
  async register(
    dto: RegisterDto,
    ipAddress: string = '0.0.0.0',
    deviceInfo?: string,
  ): Promise<LoginResponseDto> {
    // Check if terms are accepted
    if (!dto.acceptTerms) {
      throw new BadRequestException('Необходимо принять условия использования');
    }

    // Check if email already exists
    const existingUser = await this.usersService.findByEmail(dto.email);
    if (existingUser) {
      throw new ConflictException('Email уже зарегистрирован');
    }

    // Calculate age category from date of birth
    const dateOfBirth = new Date(dto.dateOfBirth);
    const ageCategory = getAgeCategory(dateOfBirth);
    const userIsMinor = isMinor(dateOfBirth);

    // Determine role based on age
    const role = userIsMinor ? UserRole.MINOR : UserRole.BUYER;

    // Handle referral code
    let referredById: string | undefined;
    if (dto.referralCode) {
      const normalizedCode = normalizeReferralCode(dto.referralCode);
      if (isValidReferralCodeFormat(normalizedCode)) {
        const referrer = await this.usersService.findByReferralCode(normalizedCode);
        if (
          referrer &&
          referrer.referralCodeActive &&
          referrer.email !== dto.email.toLowerCase() // Prevent self-referral
        ) {
          referredById = referrer.id;
        }
      }
      // Silently ignore invalid/inactive referral codes (don't expose if code exists)
    }

    // Generate unique referral code for new user
    let referralCode = generateReferralCode();
    let attempts = 0;
    const maxAttempts = 10;

    while (attempts < maxAttempts) {
      const existing = await this.usersService.findByReferralCode(referralCode);
      if (!existing) break;
      referralCode = generateReferralCode();
      attempts++;
    }

    if (attempts >= maxAttempts) {
      throw new BadRequestException('Не удалось сгенерировать реферальный код. Попробуйте снова.');
    }

    // Hash password
    const passwordHash = await this.hashPassword(dto.password);

    // Create user and partner relationship atomically
    const user = await this.prisma.$transaction(async (tx) => {
      const newUser = await tx.user.create({
        data: {
          email: dto.email.toLowerCase(),
          passwordHash,
          firstName: dto.firstName,
          lastName: dto.lastName,
          dateOfBirth,
          ageCategory,
          role,
          referralCode,
          referredById,
          verificationStatus: VerificationStatus.UNVERIFIED,
        },
      });

      // Create partner relationship if referred (skip for minors)
      if (referredById && !userIsMinor) {
        await this.createPartnerRelationship(referredById, newUser.id, tx);
      }

      // Audit log for referral code usage
      if (referredById) {
        await tx.auditLog.create({
          data: {
            userId: newUser.id,
            action: 'REFERRAL_CODE_USED',
            entityType: 'User',
            entityId: newUser.id,
            newValue: {
              referralCode: dto.referralCode,
              referrerId: referredById,
              ipAddress,
              deviceInfo,
            },
          },
        });
      }

      return newUser;
    });

    // Generate tokens and create session
    const tokens = await this.generateTokens(user);
    const { sessionId } = await this.sessionService.createSession(
      user.id,
      tokens.refreshToken,
      deviceInfo,
      ipAddress,
    );

    // Update last login
    await this.prisma.user.update({
      where: { id: user.id },
      data: { lastLoginAt: new Date() },
    });

    // Send welcome email
    await this.emailService.sendWelcomeEmail(user.email, user.firstName);

    // Send email verification
    const verificationToken = await this.tokenService.generateEmailVerificationToken(user.id);
    await this.emailService.sendEmailVerification(user.email, user.firstName, verificationToken);

    return {
      accessToken: tokens.accessToken,
      refreshToken: tokens.refreshToken,
      user: this.sanitizeUser(user),
      expiresAt: this.getExpiresAt(),
      sessionId,
    };
  }

  /**
   * Login a user.
   */
  async login(
    user: { id: string; email: string; role: string; ageCategory: string; verificationStatus: string },
    ipAddress: string = '0.0.0.0',
    deviceInfo?: string,
  ): Promise<LoginResponseDto> {
    const fullUser = await this.usersService.findById(user.id);
    if (!fullUser) {
      throw new UnauthorizedException('Пользователь не найден');
    }

    // Generate tokens and create session
    const tokens = await this.generateTokens(fullUser);
    const { sessionId } = await this.sessionService.createSession(
      user.id,
      tokens.refreshToken,
      deviceInfo,
      ipAddress,
    );

    // Update last login
    const loginTime = new Date();
    await this.prisma.user.update({
      where: { id: user.id },
      data: { lastLoginAt: loginTime },
    });

    // Send login notification (async, don't wait)
    this.emailService.sendLoginNotification(fullUser.email, fullUser.firstName, {
      ipAddress,
      deviceInfo,
      loginTime,
    }).catch((error) => {
      // Log error but don't fail login
      console.error('Failed to send login notification:', error);
    });

    return {
      accessToken: tokens.accessToken,
      refreshToken: tokens.refreshToken,
      user: this.sanitizeUser(fullUser),
      expiresAt: this.getExpiresAt(),
      sessionId,
    };
  }

  /**
   * Refresh access token.
   */
  async refreshToken(
    refreshToken: string,
    ipAddress?: string,
    deviceInfo?: string,
  ): Promise<RefreshResponseDto> {
    // Validate session
    const session = await this.sessionService.validateSession(refreshToken);
    if (!session) {
      throw new UnauthorizedException('Недействительный или просроченный токен обновления');
    }

    // Get user
    const user = await this.usersService.findById(session.userId);
    if (!user || !user.isActive) {
      throw new UnauthorizedException('Пользователь не найден или деактивирован');
    }

    // Invalidate old session
    await this.sessionService.invalidateSession(refreshToken);

    // Generate new tokens and create new session
    // Use current request IP/UA, fall back to old session values
    const tokens = await this.generateTokens(user);
    const { sessionId } = await this.sessionService.createSession(
      user.id,
      tokens.refreshToken,
      deviceInfo || session.deviceInfo,
      ipAddress || session.ipAddress,
    );

    return {
      accessToken: tokens.accessToken,
      refreshToken: tokens.refreshToken,
      expiresAt: this.getExpiresAt(),
      sessionId,
    };
  }

  /**
   * Logout user (invalidate session).
   */
  async logout(refreshToken: string): Promise<void> {
    await this.sessionService.invalidateSession(refreshToken);
  }

  /**
   * Logout user from all devices.
   */
  async logoutAll(userId: string): Promise<void> {
    await this.sessionService.invalidateAllUserSessions(userId);
  }

  /**
   * Request password reset.
   * Always returns success to prevent email enumeration.
   */
  async forgotPassword(email: string): Promise<void> {
    const user = await this.usersService.findByEmail(email.toLowerCase());
    if (!user) {
      // Return silently to prevent email enumeration
      return;
    }

    // Generate password reset token
    const token = await this.tokenService.generatePasswordResetToken(user.id);

    // Send password reset email
    await this.emailService.sendPasswordResetEmail(user.email, user.firstName, token);
  }

  /**
   * Reset password with token.
   */
  async resetPassword(token: string, newPassword: string): Promise<void> {
    // Validate token
    const userId = await this.tokenService.validatePasswordResetToken(token);

    // Hash new password
    const passwordHash = await this.hashPassword(newPassword);

    // Update password
    await this.prisma.user.update({
      where: { id: userId },
      data: { passwordHash },
    });

    // Invalidate token
    await this.tokenService.invalidateToken(token, 'password_reset');

    // Invalidate all sessions (force re-login)
    await this.sessionService.invalidateAllUserSessions(userId);
  }

  /**
   * Verify email with token.
   */
  async verifyEmail(token: string): Promise<void> {
    // Validate token
    const userId = await this.tokenService.validateEmailVerificationToken(token);

    // Mark email as verified
    // Note: Email verification alone doesn't make user VERIFIED (age verification may still be needed),
    // but it enables commission tracking in the partner program
    await this.prisma.user.update({
      where: { id: userId },
      data: { emailVerified: true },
    });

    // Invalidate token
    await this.tokenService.invalidateToken(token, 'email_verification');
  }

  /**
   * Send email verification.
   */
  async sendEmailVerification(userId: string): Promise<void> {
    const user = await this.usersService.findById(userId);
    if (!user) {
      throw new BadRequestException('Пользователь не найден');
    }

    const token = await this.tokenService.generateEmailVerificationToken(userId);

    // Send verification email
    await this.emailService.sendEmailVerification(user.email, user.firstName, token);
  }

  /**
   * Hash a password.
   */
  async hashPassword(password: string): Promise<string> {
    const rounds = Number(this.configService.get<number>('BCRYPT_ROUNDS', 12));
    return bcrypt.hash(password, rounds);
  }

  /**
   * Generate JWT tokens.
   */
  private async generateTokens(user: {
    id: string;
    email: string;
    role: string;
    ageCategory: string;
    verificationStatus: string;
  }): Promise<{ accessToken: string; refreshToken: string }> {
    const payload: JwtPayload = {
      sub: user.id,
      email: user.email,
      role: user.role,
      ageCategory: user.ageCategory,
      verificationStatus: user.verificationStatus,
    };

    const accessToken = this.jwtService.sign(payload);
    const refreshToken = this.jwtService.sign(payload, {
      expiresIn: this.configService.get<string>('JWT_REFRESH_EXPIRATION', '7d'),
    });

    return { accessToken, refreshToken };
  }

  /**
   * Get access token expiration timestamp.
   */
  private getExpiresAt(): string {
    const expiration = this.configService.get<string>('JWT_ACCESS_EXPIRATION', '15m');
    const match = expiration.match(/^(\d+)([smhd])$/);

    let milliseconds = 15 * 60 * 1000; // Default 15 minutes
    if (match) {
      const value = parseInt(match[1], 10);
      switch (match[2]) {
        case 's':
          milliseconds = value * 1000;
          break;
        case 'm':
          milliseconds = value * 60 * 1000;
          break;
        case 'h':
          milliseconds = value * 60 * 60 * 1000;
          break;
        case 'd':
          milliseconds = value * 24 * 60 * 60 * 1000;
          break;
      }
    }

    return new Date(Date.now() + milliseconds).toISOString();
  }

  /**
   * Create partner relationship when user is referred.
   * Accepts optional transaction client for atomic operations.
   */
  private async createPartnerRelationship(
    partnerId: string,
    referralId: string,
    tx?: any,
  ): Promise<void> {
    const client = tx || this.prisma;

    // Prevent circular referral chains (A→B then B→A)
    const existingChain = await client.partnerRelationship.findFirst({
      where: { partnerId: referralId, referralId: partnerId },
    });
    if (existingChain) {
      return; // Circular reference detected — skip silently
    }

    // Get the partner's existing relationships to calculate level
    const partnerRelations = await client.partnerRelationship.findMany({
      where: { referralId: partnerId },
      orderBy: { level: 'asc' },
      take: 4, // Max level is 5, so partner can be at most at level 4
    });

    // Create direct relationship
    await client.partnerRelationship.create({
      data: {
        partnerId,
        referralId,
        level: 1,
      },
    });

    // Create chain relationships (up to level 5)
    for (const relation of partnerRelations) {
      const newLevel = relation.level + 1;
      if (newLevel <= 5) {
        await client.partnerRelationship.create({
          data: {
            partnerId: relation.partnerId,
            referralId,
            level: newLevel,
          },
        });
      }
    }
  }

  /**
   * Sanitize user for response (remove sensitive fields).
   */
  private sanitizeUser(user: any) {
    const {
      passwordHash,
      isActive,
      referredById,
      ...sanitized
    } = user;

    return {
      ...sanitized,
      bonusBalance: Number(sanitized.bonusBalance),
    };
  }
}