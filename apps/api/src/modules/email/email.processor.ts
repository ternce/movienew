import {
  Process,
  Processor,
  OnQueueFailed,
  OnQueueCompleted,
  OnQueueActive,
} from '@nestjs/bull';
import { Logger } from '@nestjs/common';
import { MailerService } from '@nestjs-modules/mailer';
import { Job } from 'bull';
import { EMAIL_QUEUE, EmailJobType } from './email.constants';
import { SendEmailOptions } from './email.service';

@Processor(EMAIL_QUEUE)
export class EmailProcessor {
  private readonly logger = new Logger(EmailProcessor.name);

  constructor(private readonly mailerService: MailerService) {}

  @Process(EmailJobType.SEND_EMAIL)
  async handleSendEmail(job: Job<SendEmailOptions>): Promise<void> {
    const { to, subject, template, context } = job.data;

    this.logger.debug(`Sending email: ${template} to ${to}`);

    await this.mailerService.sendMail({
      to,
      subject,
      template,
      context,
    });
  }

  @OnQueueActive()
  onActive(job: Job): void {
    this.logger.debug(
      `Processing email job ${job.id}: ${job.data.template} to ${job.data.to}`,
    );
  }

  @OnQueueCompleted()
  onCompleted(job: Job): void {
    this.logger.log(
      `Email sent successfully: ${job.data.template} to ${job.data.to}`,
    );
  }

  @OnQueueFailed()
  onFailed(job: Job, error: Error): void {
    this.logger.error(
      `Email job ${job.id} failed (attempt ${job.attemptsMade}/${job.opts.attempts}): ${job.data.template} to ${job.data.to}`,
      error.stack,
    );
  }
}
