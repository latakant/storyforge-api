import { Test, TestingModule } from '@nestjs/testing';
import { NotFoundException } from '@nestjs/common';
import { ArticleStatus } from '@prisma/client';
import { ClapsService } from './claps.service';
import { PrismaService } from '../prisma/prisma.service';

// ─── Mock data ───────────────────────────────────────────────────────────────

const mockPublishedArticle = {
  id: 'article-1',
  status: ArticleStatus.PUBLISHED,
};

const prismaMock = {
  article: { findUnique: jest.fn() },
  clap: {
    create: jest.fn(),
    count: jest.fn(),
  },
};

// ─── Tests ────────────────────────────────────────────────────────────────────

describe('ClapsService', () => {
  let service: ClapsService;

  beforeEach(async () => {
    jest.clearAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ClapsService,
        { provide: PrismaService, useValue: prismaMock },
      ],
    }).compile();

    service = module.get<ClapsService>(ClapsService);
  });

  // ── clap ────────────────────────────────────────────────────────────────────

  describe('clap', () => {
    it('appends a Clap event and returns updated count', async () => {
      prismaMock.article.findUnique.mockResolvedValue(mockPublishedArticle);
      prismaMock.clap.create.mockResolvedValue({ id: 'clap-1' });
      prismaMock.clap.count.mockResolvedValue(5);

      const result = await service.clap('article-1', 'user-1');

      expect(prismaMock.clap.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: { articleId: 'article-1', userId: 'user-1' },
        }),
      );
      expect(result).toEqual({ articleId: 'article-1', clapCount: 5 });
    });

    it('allows multiple claps from the same user (append-only, no uniqueness constraint)', async () => {
      prismaMock.article.findUnique.mockResolvedValue(mockPublishedArticle);
      prismaMock.clap.create.mockResolvedValue({ id: 'clap-2' });
      prismaMock.clap.count.mockResolvedValue(6);

      // Second clap from same user — should succeed
      const result = await service.clap('article-1', 'user-1');
      expect(result.clapCount).toBe(6);
    });

    it('throws NotFoundException when article does not exist', async () => {
      prismaMock.article.findUnique.mockResolvedValue(null);

      await expect(service.clap('ghost-article', 'user-1')).rejects.toThrow(NotFoundException);
    });

    it('throws NotFoundException when article is not PUBLISHED', async () => {
      prismaMock.article.findUnique.mockResolvedValue({
        ...mockPublishedArticle,
        status: ArticleStatus.DRAFT,
      });

      await expect(service.clap('article-1', 'user-1')).rejects.toThrow(NotFoundException);
    });
  });

  // ── getCount ─────────────────────────────────────────────────────────────────

  describe('getCount', () => {
    it('returns clap count for a known article', async () => {
      prismaMock.article.findUnique.mockResolvedValue(mockPublishedArticle);
      prismaMock.clap.count.mockResolvedValue(42);

      const result = await service.getCount('article-1');

      expect(result).toEqual({ articleId: 'article-1', clapCount: 42 });
    });

    it('throws NotFoundException when article does not exist', async () => {
      prismaMock.article.findUnique.mockResolvedValue(null);

      await expect(service.getCount('ghost-article')).rejects.toThrow(NotFoundException);
    });
  });
});
