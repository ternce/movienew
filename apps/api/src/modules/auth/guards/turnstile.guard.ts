import {
  CanActivate,
  ExecutionContext,
  Injectable,
  BadRequestException,
  Logger,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

interface TurnstileResponse {
  success: boolean;
  'error-codes'?: string[];
  challenge_ts?: string;
}

@Injectable()
export class TurnstileGuard implements CanActivate {
  private readonly logger = new Logger(TurnstileGuard.name);
  private readonly secretKey: string;

  constructor(private readonly configService: ConfigService) {
    this.secretKey = this.configService.get<string>('TURNSTILE_SECRET_KEY', '');
  }

  async canActivate(context: ExecutionContext): Promise<boolean> {
    // Skip validation in dev/test when no secret key configured
    if (!this.secretKey) {
      this.logger.warn('Turnstile secret key not configured — skipping validation');
      return true;
    }

    const request = context.switchToHttp().getRequest();
    const token = request.body?.turnstileToken;

    if (!token) {
      throw new BadRequestException('Проверка безопасности не пройдена');
    }

    const ip = request.ip || request.headers['x-forwarded-for'] || '';

    const result = await this.verify(token, ip);

    if (!result.success) {
      this.logger.warn(`Turnstile validation failed: ${JSON.stringify(result['error-codes'])}`);
      throw new BadRequestException('Проверка безопасности не пройдена');
    }

    return true;
  }

  private async verify(token: string, remoteip: string): Promise<TurnstileResponse> {
    try {
      const response = await fetch(
        'https://challenges.cloudflare.com/turnstile/v0/siteverify',
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            secret: this.secretKey,
            response: token,
            remoteip,
          }),
        },
      );

      return (await response.json()) as TurnstileResponse;
    } catch (error) {
      this.logger.error('Turnstile verification request failed:', error);
      return { success: false, 'error-codes': ['internal-error'] };
    }
  }
}