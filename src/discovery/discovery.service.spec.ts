import { Test, TestingModule } from '@nestjs/testing';
import { ArticleStatus } from '@prisma/client';
import { DiscoveryService } from './discovery.service';
import { PrismaService } from '../prisma/prisma.service';

// ─── Mock data ───────────────────────────────────────────────────────────────

const mockArticleRow = {
  id: 'article-1',
  slug: 'my-post',
  title: 'My Post',
  publishedAt: new Date('2026-01-15'),
  coverImageUrl: null,
  authorId: 'author-1',
  createdAt: new Date('2026-01-01'),
  updatedAt: new Date('2026-01-15'),
  author: { id: 'author-1', name: 'Alice' },
  _count: { claps: 7 },
};

const mockTagRow = {
  id: 'tag-1',
  name: 'TypeScript',
  slug: 'typescript',
  _count: { articles: 4 },
};

const prismaMock = {
  article: {
    findMany: jest.fn(),
    count: jest.fn(),
  },
  tag: {
    findMany: jest.fn(),
  },
};

// ─── Tests ────────────────────────────────────────────────────────────────────

describe('DiscoveryService', () => {
  let service: DiscoveryService;

  beforeEach(async () => {
    jest.clearAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        DiscoveryService,
        { provide: PrismaService, useValue: prismaMock },
      ],
    }).compile();

    service = module.get<DiscoveryService>(DiscoveryService);
  });

  // ── listArticles ─────────────────────────────────────────────────────────────

  describe('listArticles', () => {
    it('returns paginated published articles', async () => {
      prismaMock.article.findMany.mockResolvedValue([mockArticleRow]);
      prismaMock.article.count.mockResolvedValue(1);

      const result = await service.listArticles(1, 20);

      expect(result.data).toHaveLength(1);
      expect(result.data[0]).toMatchObject({ slug: 'my-post', clapCount: 7 });
      expect(result.meta).toMatchObject({ total: 1, page: 1, limit: 20, totalPages: 1 });
    });

    it('filters by tag slug when provided', async () => {
      prismaMock.article.findMany.mockResolvedValue([mockArticleRow]);
      prismaMock.article.count.mockResolvedValue(1);

      await service.listArticles(1, 20, 'typescript');

      const whereArg = prismaMock.article.findMany.mock.calls[0][0].where;
      expect(whereArg).toMatchObject({
        status: ArticleStatus.PUBLISHED,
        tags: { some: { tag: { slug: 'typescript' } } },
      });
    });

    it('returns empty page when no articles match', async () => {
      prismaMock.article.findMany.mockResolvedValue([]);
      prismaMock.article.count.mockResolvedValue(0);

      const result = await service.listArticles(1, 20);

      expect(result.data).toEqual([]);
      expect(result.meta.totalPages).toBe(0);
    });

    it('only queries PUBLISHED articles', async () => {
      prismaMock.article.findMany.mockResolvedValue([]);
      prismaMock.article.count.mockResolvedValue(0);

      await service.listArticles();

      const whereArg = prismaMock.article.findMany.mock.calls[0][0].where;
      expect(whereArg.status).toBe(ArticleStatus.PUBLISHED);
    });
  });

  // ── listTags ─────────────────────────────────────────────────────────────────

  describe('listTags', () => {
    it('returns tags with article counts sorted alphabetically', async () => {
      prismaMock.tag.findMany.mockResolvedValue([mockTagRow]);

      const result = await service.listTags();

      expect(result).toHaveLength(1);
      expect(result[0]).toMatchObject({ slug: 'typescript', articleCount: 4 });
      expect(prismaMock.tag.findMany).toHaveBeenCalledWith(
        expect.objectContaining({ orderBy: { name: 'asc' } }),
      );
    });

    it('returns empty array when no tags exist', async () => {
      prismaMock.tag.findMany.mockResolvedValue([]);

      const result = await service.listTags();

      expect(result).toEqual([]);
    });
  });

  // ── trending ─────────────────────────────────────────────────────────────────

  describe('trending', () => {
    it('returns articles ordered by clap count descending', async () => {
      prismaMock.article.findMany.mockResolvedValue([mockArticleRow]);

      const result = await service.trending(10);

      expect(result).toHaveLength(1);
      expect(result[0].clapCount).toBe(7);
      const orderByArg = prismaMock.article.findMany.mock.calls[0][0].orderBy;
      expect(orderByArg).toMatchObject({ claps: { _count: 'desc' } });
    });

    it('only includes PUBLISHED articles', async () => {
      prismaMock.article.findMany.mockResolvedValue([]);

      await service.trending(5);

      const whereArg = prismaMock.article.findMany.mock.calls[0][0].where;
      expect(whereArg.status).toBe(ArticleStatus.PUBLISHED);
    });
  });
});
