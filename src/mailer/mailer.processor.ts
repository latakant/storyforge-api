import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Logger } from '@nestjs/common';
import { Job } from 'bullmq';
import { MAIL_QUEUE, MailJobType, MailJobPayload } from './mailer.types';

@Processor(MAIL_QUEUE)
export class MailerProcessor extends WorkerHost {
  private readonly logger = new Logger(MailerProcessor.name);

  async process(job: Job<MailJobPayload>): Promise<void> {
    switch (job.data.type) {
      case MailJobType.ARTICLE_PUBLISHED:
        await this.handleArticlePublished(job);
        break;
      case MailJobType.COMMENT_APPROVED:
        await this.handleCommentApproved(job);
        break;
      default:
        this.logger.warn(`Unknown job type: ${(job.data as { type: string }).type}`);
    }
  }

  private async handleArticlePublished(job: Job<MailJobPayload>): Promise<void> {
    const data = job.data as import('./mailer.types').ArticlePublishedPayload;
    this.logger.log(
      `[MAIL] Article published: "${data.articleTitle}" → ${data.authorEmail}`,
    );
    // TODO: integrate Resend/Nodemailer here
    // await resend.emails.send({ to: data.authorEmail, subject: `"${data.articleTitle}" is live!`, ... })
  }

  private async handleCommentApproved(job: Job<MailJobPayload>): Promise<void> {
    const data = job.data as import('./mailer.types').CommentApprovedPayload;
    this.logger.log(
      `[MAIL] Comment approved on "${data.articleTitle}" → ${data.authorEmail}`,
    );
    // TODO: integrate Resend/Nodemailer here
  }
}
