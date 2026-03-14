import { Test, TestingModule } from '@nestjs/testing';
import { getQueueToken } from '@nestjs/bullmq';
import { MailerService } from './mailer.service';
import { MAIL_QUEUE, MailJobType } from './mailer.types';

// ─── Mock data ───────────────────────────────────────────────────────────────

const mockQueue = {
  add: jest.fn(),
};

// ─── Tests ────────────────────────────────────────────────────────────────────

describe('MailerService', () => {
  let service: MailerService;

  beforeEach(async () => {
    jest.clearAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        MailerService,
        { provide: getQueueToken(MAIL_QUEUE), useValue: mockQueue },
      ],
    }).compile();

    service = module.get<MailerService>(MailerService);
  });

  // ── notifyArticlePublished ───────────────────────────────────────────────────

  describe('notifyArticlePublished', () => {
    it('enqueues article.published job with retry config', async () => {
      mockQueue.add.mockResolvedValue({ id: 'job-1' });

      await service.notifyArticlePublished({
        authorEmail: 'alice@example.com',
        authorName: 'Alice',
        articleTitle: 'My First Post',
        articleSlug: 'my-first-post',
      });

      expect(mockQueue.add).toHaveBeenCalledWith(
        MailJobType.ARTICLE_PUBLISHED,
        expect.objectContaining({
          type: MailJobType.ARTICLE_PUBLISHED,
          authorEmail: 'alice@example.com',
          articleTitle: 'My First Post',
        }),
        expect.objectContaining({
          attempts: 3,
          backoff: expect.objectContaining({ type: 'exponential' }),
        }),
      );
    });
  });

  // ── notifyCommentApproved ────────────────────────────────────────────────────

  describe('notifyCommentApproved', () => {
    it('enqueues comment.approved job with retry config', async () => {
      mockQueue.add.mockResolvedValue({ id: 'job-2' });

      await service.notifyCommentApproved({
        authorEmail: 'alice@example.com',
        authorName: 'Alice',
        articleTitle: 'My First Post',
        articleSlug: 'my-first-post',
        commentBody: 'Great article!',
      });

      expect(mockQueue.add).toHaveBeenCalledWith(
        MailJobType.COMMENT_APPROVED,
        expect.objectContaining({
          type: MailJobType.COMMENT_APPROVED,
          commentBody: 'Great article!',
        }),
        expect.objectContaining({ attempts: 3 }),
      );
    });
  });
});
