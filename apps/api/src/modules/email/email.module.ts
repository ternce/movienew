import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { MailerModule } from '@nestjs-modules/mailer';
import { HandlebarsAdapter } from '@nestjs-modules/mailer/dist/adapters/handlebars.adapter';
import { BullModule } from '@nestjs/bull';
import { join } from 'path';

import { EmailService } from './email.service';
import { EmailProcessor } from './email.processor';
import { EMAIL_QUEUE } from './email.constants';

@Module({
  imports: [
    MailerModule.forRootAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (config: ConfigService) => {
        const isProduction = config.get<string>('NODE_ENV') === 'production';
        const templateDir = isProduction
          ? join(__dirname, 'templates')
          : join(process.cwd(), 'src/modules/email/templates');

        return {
        transport: {
          host: config.get<string>('SMTP_HOST', 'localhost'),
          port: config.get<number>('SMTP_PORT', 1025),
          secure: config.get<string>('SMTP_SECURE', 'false') === 'true',
          auth: config.get<string>('SMTP_USER')
            ? {
                user: config.get<string>('SMTP_USER'),
                pass: config.get<string>('SMTP_PASSWORD'),
              }
            : undefined,
        },
        defaults: {
          from: `"${config.get<string>('SMTP_FROM_NAME', 'MoviePlatform')}" <${config.get<string>('SMTP_FROM_EMAIL', 'noreply@movieplatform.local')}>`,
        },
        template: {
          dir: templateDir,
          adapter: new HandlebarsAdapter(),
          options: {
            strict: true,
          },
        },
        };
      },
    }),
    BullModule.registerQueueAsync({
      name: EMAIL_QUEUE,
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (config: ConfigService) => {
        const redisUrl = config.get<string>('REDIS_URL');
        const password = config.get<string>('REDIS_PASSWORD', '');

        return {
          redis: redisUrl
            ? redisUrl
            : {
                host: config.get<string>('REDIS_HOST', 'localhost'),
                port: config.get<number>('REDIS_PORT', 6379),
                ...(password ? { password } : {}),
              },
          defaultJobOptions: {
            removeOnComplete: true,
            removeOnFail: false,
            attempts: 3,
            backoff: {
              type: 'exponential',
              delay: 5000,
            },
          },
        };
      },
    }),
  ],
  providers: [EmailService, EmailProcessor],
  exports: [EmailService],
})
export class EmailModule {}
