import { Test, TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { MailerProcessor } from './mailer.processor';
import { MailJobType, ArticlePublishedPayload, CommentApprovedPayload } from './mailer.types';

// ─── Mock Resend ─────────────────────────────────────────────────────────────

const mockResendSend = jest.fn();

jest.mock('resend', () => ({
  Resend: jest.fn().mockImplementation(() => ({
    emails: { send: mockResendSend },
  })),
}));

// ─── Helpers ─────────────────────────────────────────────────────────────────

const publishedPayload: ArticlePublishedPayload = {
  type: MailJobType.ARTICLE_PUBLISHED,
  authorEmail: 'alice@example.com',
  authorName: 'Alice',
  articleTitle: 'My First Post',
  articleSlug: 'my-first-post',
};

const approvedPayload: CommentApprovedPayload = {
  type: MailJobType.COMMENT_APPROVED,
  authorEmail: 'alice@example.com',
  authorName: 'Alice',
  articleTitle: 'My First Post',
  articleSlug: 'my-first-post',
  commentBody: 'Great article!',
};

function makeJob(data: ArticlePublishedPayload | CommentApprovedPayload) {
  return { data } as import('bullmq').Job<typeof data>;
}

// ─── Tests ────────────────────────────────────────────────────────────────────

describe('MailerProcessor', () => {
  let processor: MailerProcessor;

  beforeEach(() => jest.clearAllMocks());

  async function buildProcessor(apiKey?: string): Promise<MailerProcessor> {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        MailerProcessor,
        {
          provide: ConfigService,
          useValue: {
            get: (key: string, defaultValue?: string) => {
              if (key === 'RESEND_API_KEY') return apiKey;
              if (key === 'MAIL_FROM') return defaultValue;
              return defaultValue;
            },
          },
        },
      ],
    }).compile();

    return module.get<MailerProcessor>(MailerProcessor);
  }

  // ── dry-run (no API key) ─────────────────────────────────────────────────────

  describe('without RESEND_API_KEY (dry-run mode)', () => {
    beforeEach(async () => {
      processor = await buildProcessor(undefined);
    });

    it('logs article.published without calling Resend', async () => {
      await processor.process(makeJob(publishedPayload));

      expect(mockResendSend).not.toHaveBeenCalled();
    });

    it('logs comment.approved without calling Resend', async () => {
      await processor.process(makeJob(approvedPayload));

      expect(mockResendSend).not.toHaveBeenCalled();
    });
  });

  // ── live mode (API key present) ──────────────────────────────────────────────

  describe('with RESEND_API_KEY', () => {
    beforeEach(async () => {
      processor = await buildProcessor('re_test_key_123');
    });

    it('sends article.published email via Resend', async () => {
      mockResendSend.mockResolvedValue({ data: { id: 'email-1' }, error: null });

      await processor.process(makeJob(publishedPayload));

      expect(mockResendSend).toHaveBeenCalledWith(
        expect.objectContaining({
          to: 'alice@example.com',
          subject: expect.stringContaining('My First Post'),
          html: expect.stringContaining('my-first-post'),
        }),
      );
    });

    it('sends comment.approved email via Resend', async () => {
      mockResendSend.mockResolvedValue({ data: { id: 'email-2' }, error: null });

      await processor.process(makeJob(approvedPayload));

      expect(mockResendSend).toHaveBeenCalledWith(
        expect.objectContaining({
          to: 'alice@example.com',
          subject: expect.stringContaining('My First Post'),
          html: expect.stringContaining('Great article!'),
        }),
      );
    });

    it('throws when Resend returns an error (triggers BullMQ retry)', async () => {
      mockResendSend.mockResolvedValue({ data: null, error: { message: 'rate limited' } });

      await expect(processor.process(makeJob(publishedPayload))).rejects.toThrow('Resend error: rate limited');
    });
  });
});
