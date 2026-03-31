import { OnWorkerEvent, Processor, WorkerHost } from '@nestjs/bullmq';
import { Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Job } from 'bullmq';
import { Resend } from 'resend';
import {
  MAIL_QUEUE,
  MailJobType,
  MailJobPayload,
  ArticlePublishedPayload,
  CommentApprovedPayload,
} from './mailer.types';

@Processor(MAIL_QUEUE)
export class MailerProcessor extends WorkerHost {
  private readonly logger = new Logger(MailerProcessor.name);
  private readonly resend: Resend | null;
  private readonly from: string;

  constructor(private readonly config: ConfigService) {
    super();
    const apiKey = config.get<string>('RESEND_API_KEY');
    this.resend = apiKey ? new Resend(apiKey) : null;
    this.from = config.get<string>('MAIL_FROM', 'StoryForge <noreply@storyforge.dev>');

    if (!this.resend) {
      this.logger.warn('RESEND_API_KEY not set — emails will be logged only');
    }
  }

  async process(job: Job<MailJobPayload>): Promise<void> {
    switch (job.data.type) {
      case MailJobType.ARTICLE_PUBLISHED:
        await this.handleArticlePublished(job.data);
        break;
      case MailJobType.COMMENT_APPROVED:
        await this.handleCommentApproved(job.data);
        break;
      default:
        this.logger.warn(`Unknown job type: ${(job.data as { type: string }).type}`);
    }
  }

  private async handleArticlePublished(data: ArticlePublishedPayload): Promise<void> {
    const subject = `Your article "${data.articleTitle}" is now live!`;
    const html = `
      <h2>Congratulations, ${data.authorName}!</h2>
      <p>Your article <strong>${data.articleTitle}</strong> has been published.</p>
      <p><a href="https://storyforge.dev/articles/${data.articleSlug}">View it here →</a></p>
      <hr/>
      <small>StoryForge Publishing Platform</small>
    `;

    await this.send({ to: data.authorEmail, subject, html });
  }

  private async handleCommentApproved(data: CommentApprovedPayload): Promise<void> {
    const subject = `New comment approved on "${data.articleTitle}"`;
    const html = `
      <h2>Hi ${data.authorName},</h2>
      <p>A comment on your article <strong>${data.articleTitle}</strong> was approved:</p>
      <blockquote>${data.commentBody}</blockquote>
      <p><a href="https://storyforge.dev/articles/${data.articleSlug}#comments">View comments →</a></p>
      <hr/>
      <small>StoryForge Publishing Platform</small>
    `;

    await this.send({ to: data.authorEmail, subject, html });
  }

  @OnWorkerEvent('failed')
  onFailed(job: Job, error: Error): void {
    this.logger.error(
      `Mail job ${job.id ?? 'unknown'} (${job.name}) exhausted all ${job.attemptsMade} attempt(s) — retained in failed set. Error: ${error.message}`,
    );
  }

  private async send(opts: { to: string; subject: string; html: string }): Promise<void> {
    if (!this.resend) {
      this.logger.log(`[MAIL-DRY] To: ${opts.to} | Subject: ${opts.subject}`);
      return;
    }

    const { error } = await this.resend.emails.send({
      from: this.from,
      to: opts.to,
      subject: opts.subject,
      html: opts.html,
    });

    if (error) {
      // Throw so BullMQ retries the job (up to 3 attempts with exponential backoff)
      throw new Error(`Resend error: ${error.message}`);
    }

    this.logger.log(`[MAIL] Sent to ${opts.to}: ${opts.subject}`);
  }
}
