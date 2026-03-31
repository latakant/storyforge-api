import { Injectable, Logger } from '@nestjs/common';
import { InjectQueue } from '@nestjs/bullmq';
import { Queue } from 'bullmq';
import {
  MAIL_QUEUE,
  MailJobType,
  ArticlePublishedPayload,
  CommentApprovedPayload,
} from './mailer.types';

@Injectable()
export class MailerService {
  private readonly logger = new Logger(MailerService.name);

  constructor(
    @InjectQueue(MAIL_QUEUE) private readonly mailQueue: Queue,
  ) {}

  async notifyArticlePublished(payload: Omit<ArticlePublishedPayload, 'type'>): Promise<void> {
    await this.mailQueue.add(
      MailJobType.ARTICLE_PUBLISHED,
      { type: MailJobType.ARTICLE_PUBLISHED, ...payload },
      { attempts: 3, backoff: { type: 'exponential', delay: 5_000 }, removeOnFail: false },
    );
    this.logger.log(`Queued article.published email for ${payload.authorEmail}`);
  }

  async notifyCommentApproved(payload: Omit<CommentApprovedPayload, 'type'>): Promise<void> {
    await this.mailQueue.add(
      MailJobType.COMMENT_APPROVED,
      { type: MailJobType.COMMENT_APPROVED, ...payload },
      { attempts: 3, backoff: { type: 'exponential', delay: 5_000 }, removeOnFail: false },
    );
    this.logger.log(`Queued comment.approved email for ${payload.authorEmail}`);
  }
}
