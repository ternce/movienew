import {
  Controller,
  Post,
  Get,
  Body,
  Param,
  UseGuards,
  HttpCode,
  HttpStatus,
  Req,
  Ip,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiBody,
} from '@nestjs/swagger';
import { Request } from 'express';

import { AuthService } from './auth.service';
import { LocalAuthGuard } from './guards/local-auth.guard';
import { TurnstileGuard } from './guards/turnstile.guard';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { Public } from '../../common/decorators/public.decorator';
import { ThrottleAuth } from '../../common/decorators/throttle.decorator';
import {
  RegisterDto,
  LoginDto,
  RefreshTokenDto,
  ForgotPasswordDto,
  ResetPasswordDto,
  LoginResponseDto,
  RefreshResponseDto,
  MessageResponseDto,
} from './dto';

@ApiTags('auth')
@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  /**
   * Register a new user.
   */
  @Post('register')
  @Public()
  @UseGuards(TurnstileGuard)
  @ThrottleAuth.Register()
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Register a new user' })
  @ApiBody({ type: RegisterDto })
  @ApiResponse({
    status: 201,
    description: 'User successfully registered',
    type: LoginResponseDto,
  })
  @ApiResponse({
    status: 400,
    description: 'Invalid input data or terms not accepted',
  })
  @ApiResponse({
    status: 409,
    description: 'Email already registered',
  })
  async register(
    @Body() registerDto: RegisterDto,
    @Req() req: Request,
    @Ip() ip: string,
  ): Promise<LoginResponseDto> {
    const deviceInfo = req.headers['user-agent'];
    return this.authService.register(registerDto, ip, deviceInfo);
  }

  /**
   * Login with email and password.
   */
  @Post('login')
  @Public()
  @ThrottleAuth.Login()
  @UseGuards(LocalAuthGuard)
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Login with email and password' })
  @ApiBody({ type: LoginDto })
  @ApiResponse({
    status: 200,
    description: 'Login successful',
    type: LoginResponseDto,
  })
  @ApiResponse({
    status: 401,
    description: 'Invalid credentials',
  })
  async login(
    @CurrentUser() user: any,
    @Req() req: Request,
    @Ip() ip: string,
  ): Promise<LoginResponseDto> {
    const deviceInfo = req.headers['user-agent'];
    return this.authService.login(user, ip, deviceInfo);
  }

  /**
   * Refresh access token using refresh token.
   */
  @Post('refresh')
  @Public()
  @ThrottleAuth.RefreshToken()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Refresh access token' })
  @ApiBody({ type: RefreshTokenDto })
  @ApiResponse({
    status: 200,
    description: 'Token refreshed successfully',
    type: RefreshResponseDto,
  })
  @ApiResponse({
    status: 401,
    description: 'Invalid or expired refresh token',
  })
  async refresh(
    @Body() dto: RefreshTokenDto,
    @Req() req: Request,
    @Ip() ip: string,
  ): Promise<RefreshResponseDto> {
    const deviceInfo = req.headers['user-agent'];
    return this.authService.refreshToken(dto.refreshToken, ip, deviceInfo);
  }

  /**
   * Logout (invalidate current session).
   */
  @Post('logout')
  @HttpCode(HttpStatus.OK)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Logout (invalidate session)' })
  @ApiBody({ type: RefreshTokenDto })
  @ApiResponse({
    status: 200,
    description: 'Logged out successfully',
    type: MessageResponseDto,
  })
  async logout(
    @Body() dto: RefreshTokenDto,
  ): Promise<MessageResponseDto> {
    await this.authService.logout(dto.refreshToken);
    return { message: 'Вы успешно вышли' };
  }

  /**
   * Logout from all devices.
   */
  @Post('logout-all')
  @HttpCode(HttpStatus.OK)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Logout from all devices' })
  @ApiResponse({
    status: 200,
    description: 'Logged out from all devices',
    type: MessageResponseDto,
  })
  async logoutAll(
    @CurrentUser('id') userId: string,
  ): Promise<MessageResponseDto> {
    await this.authService.logoutAll(userId);
    return { message: 'Вы вышли со всех устройств' };
  }

  /**
   * Request password reset email.
   * Always returns success to prevent email enumeration.
   */
  @Post('forgot-password')
  @Public()
  @ThrottleAuth.ForgotPassword()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Request password reset email' })
  @ApiBody({ type: ForgotPasswordDto })
  @ApiResponse({
    status: 200,
    description: 'If the email exists, a reset link will be sent',
    type: MessageResponseDto,
  })
  async forgotPassword(
    @Body() dto: ForgotPasswordDto,
  ): Promise<MessageResponseDto> {
    await this.authService.forgotPassword(dto.email);
    return {
      message: 'Если email зарегистрирован в системе, вы получите ссылку для сброса пароля',
    };
  }

  /**
   * Reset password using token from email.
   */
  @Post('reset-password')
  @Public()
  @ThrottleAuth.ResetPassword()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Reset password with token' })
  @ApiBody({ type: ResetPasswordDto })
  @ApiResponse({
    status: 200,
    description: 'Password reset successfully',
    type: MessageResponseDto,
  })
  @ApiResponse({
    status: 400,
    description: 'Invalid or expired reset token',
  })
  async resetPassword(
    @Body() dto: ResetPasswordDto,
  ): Promise<MessageResponseDto> {
    await this.authService.resetPassword(dto.token, dto.newPassword);
    return { message: 'Пароль успешно сброшен. Войдите с новым паролем.' };
  }

  /**
   * Verify email address using token.
   */
  @Get('verify-email/:token')
  @Public()
  @ApiOperation({ summary: 'Verify email address' })
  @ApiResponse({
    status: 200,
    description: 'Email verified successfully',
    type: MessageResponseDto,
  })
  @ApiResponse({
    status: 400,
    description: 'Invalid or expired verification token',
  })
  async verifyEmail(
    @Param('token') token: string,
  ): Promise<MessageResponseDto> {
    await this.authService.verifyEmail(token);
    return { message: 'Email успешно подтверждён' };
  }

  /**
   * Resend email verification.
   */
  @Post('resend-verification')
  @ThrottleAuth.EmailVerification()
  @HttpCode(HttpStatus.OK)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Resend email verification' })
  @ApiResponse({
    status: 200,
    description: 'Verification email sent',
    type: MessageResponseDto,
  })
  async resendVerification(
    @CurrentUser('id') userId: string,
  ): Promise<MessageResponseDto> {
    await this.authService.sendEmailVerification(userId);
    return { message: 'Письмо для подтверждения отправлено' };
  }
}