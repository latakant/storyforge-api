import { Test, TestingModule } from '@nestjs/testing';
import {
  NotFoundException,
  ForbiddenException,
  ConflictException,
  BadRequestException,
} from '@nestjs/common';
import { Prisma, ArticleStatus, Role } from '@prisma/client';
import { ArticlesService } from './articles.service';
import { PrismaService } from '../prisma/prisma.service';

// ─── Mock data ───────────────────────────────────────────────────────────────

const mockAuthor = { id: 'author-1', role: Role.WRITER };
const mockEditor = { id: 'editor-1', role: Role.EDITOR };
const mockAdmin  = { id: 'admin-1',  role: Role.ADMIN };

const mockArticle = {
  id: 'article-1',
  authorId: 'author-1',
  slug: 'my-first-post',
  title: 'My First Post',
  status: ArticleStatus.DRAFT,
  publishedAt: null,
  coverImageUrl: null,
  createdAt: new Date('2026-01-01'),
  updatedAt: new Date('2026-01-01'),
};

const mockRevision = {
  id: 'rev-1',
  articleId: 'article-1',
  content: 'Hello world',
  editorNote: null,
  createdAt: new Date('2026-01-01'),
};

const prismaMock = {
  article: {
    create: jest.fn(),
    findMany: jest.fn(),
    findUnique: jest.fn(),
    findFirst: jest.fn(),
    update: jest.fn(),
    count: jest.fn(),
  },
  revision: {
    create: jest.fn(),
    findMany: jest.fn(),
    findFirst: jest.fn(),
  },
  articleEvent: {
    create: jest.fn(),
  },
  $transaction: jest.fn(),
};

// ─── Tests ────────────────────────────────────────────────────────────────────

describe('ArticlesService', () => {
  let service: ArticlesService;

  beforeEach(async () => {
    jest.clearAllMocks();

    // articleEvent.create always resolves (it's fire-and-forget inside transactions)
    prismaMock.articleEvent.create.mockResolvedValue({ id: 'event-1' });

    // Handle both $transaction forms:
    //   callback form: $transaction(async (tx) => { ... tx.model.op() ... })
    //   array form:    $transaction([promise1, promise2, ...])
    prismaMock.$transaction.mockImplementation(async (opsOrFn: unknown) => {
      if (typeof opsOrFn === 'function') return (opsOrFn as (tx: unknown) => Promise<unknown>)(prismaMock);
      return Promise.all(opsOrFn as Promise<unknown>[]);
    });

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ArticlesService,
        { provide: PrismaService, useValue: prismaMock },
      ],
    }).compile();

    service = module.get<ArticlesService>(ArticlesService);
  });

  // ── create ──────────────────────────────────────────────────────────────────

  describe('create', () => {
    it('creates article as DRAFT with generated slug', async () => {
      prismaMock.article.create.mockResolvedValue(mockArticle);
      prismaMock.revision.create.mockResolvedValue(mockRevision);

      const result = await service.create(
        { title: 'My First Post', content: 'Hello world' },
        mockAuthor.id,
      );

      expect(prismaMock.$transaction).toHaveBeenCalled();
      expect(result).toMatchObject({ title: 'My First Post' });
    });

    it('generates slug from title', async () => {
      prismaMock.article.create.mockResolvedValue({ ...mockArticle, slug: 'hello-world-2026' });
      prismaMock.revision.create.mockResolvedValue(mockRevision);

      await service.create({ title: 'Hello World 2026', content: 'body' }, mockAuthor.id);

      const createCall = prismaMock.article.create.mock.calls[0][0];
      expect(createCall.data.slug).toMatch(/^hello-world-2026/);
    });
  });

  // ── findBySlug ──────────────────────────────────────────────────────────────

  describe('findBySlug', () => {
    it('returns article with latest revision', async () => {
      prismaMock.article.findUnique.mockResolvedValue({
        ...mockArticle,
        status: ArticleStatus.PUBLISHED,
        revisions: [mockRevision],
        author: { id: mockAuthor.id, name: 'Alice' },
        tags: [],
        _count: { claps: 3 },
      });

      const result = await service.findBySlug('my-first-post');

      expect(result).toMatchObject({ slug: 'my-first-post' });
    });

    it('throws NotFoundException for unknown slug', async () => {
      prismaMock.article.findUnique.mockResolvedValue(null);

      await expect(service.findBySlug('ghost-slug')).rejects.toThrow(NotFoundException);
    });
  });

  // ── saveContent ─────────────────────────────────────────────────────────────

  describe('saveContent', () => {
    it('creates a new Revision — never overwrites', async () => {
      prismaMock.article.findUnique.mockResolvedValue(mockArticle);
      prismaMock.revision.create.mockResolvedValue({ ...mockRevision, content: 'New content' });

      const result = await service.saveContent('article-1', 'New content', mockAuthor.id);

      // Must INSERT revision, never UPDATE article.content
      expect(prismaMock.revision.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            articleId: 'article-1',
            content: 'New content',
          }),
        }),
      );
      expect(result.content).toBe('New content');
    });

    it('throws ForbiddenException when non-author tries to save content', async () => {
      prismaMock.article.findUnique.mockResolvedValue(mockArticle); // authorId = 'author-1'

      await expect(
        service.saveContent('article-1', 'Hacked content', 'other-user-id'),
      ).rejects.toThrow(ForbiddenException);
    });

    it('throws BadRequestException when article is PUBLISHED (slug locked, content frozen)', async () => {
      prismaMock.article.findUnique.mockResolvedValue({
        ...mockArticle,
        status: ArticleStatus.PUBLISHED,
      });

      await expect(
        service.saveContent('article-1', 'Late edit', mockAuthor.id),
      ).rejects.toThrow(BadRequestException);
    });

    it('throws NotFoundException for unknown article', async () => {
      prismaMock.article.findUnique.mockResolvedValue(null);

      await expect(
        service.saveContent('ghost-id', 'content', mockAuthor.id),
      ).rejects.toThrow(NotFoundException);
    });
  });

  // ── submit ──────────────────────────────────────────────────────────────────

  describe('submit', () => {
    it('transitions DRAFT → SUBMITTED', async () => {
      prismaMock.article.findUnique.mockResolvedValue(mockArticle);
      prismaMock.revision.findFirst.mockResolvedValue(mockRevision);
      prismaMock.article.update.mockResolvedValue({ ...mockArticle, status: ArticleStatus.SUBMITTED });

      const result = await service.submit('article-1', mockAuthor.id);

      expect(result.status).toBe(ArticleStatus.SUBMITTED);
    });

    it('throws BadRequestException when not in DRAFT state', async () => {
      prismaMock.article.findUnique.mockResolvedValue({
        ...mockArticle,
        status: ArticleStatus.SUBMITTED,
      });

      await expect(service.submit('article-1', mockAuthor.id)).rejects.toThrow(BadRequestException);
    });

    it('throws BadRequestException when no content revision exists', async () => {
      prismaMock.article.findUnique.mockResolvedValue(mockArticle);
      prismaMock.revision.findFirst.mockResolvedValue(null);

      await expect(service.submit('article-1', mockAuthor.id)).rejects.toThrow(BadRequestException);
    });

    it('throws ForbiddenException for non-author', async () => {
      prismaMock.article.findUnique.mockResolvedValue(mockArticle);

      await expect(service.submit('article-1', 'not-the-author')).rejects.toThrow(ForbiddenException);
    });
  });

  // ── publish ─────────────────────────────────────────────────────────────────

  describe('publish', () => {
    it('transitions SUBMITTED → PUBLISHED and locks slug', async () => {
      const submittedArticle = { ...mockArticle, status: ArticleStatus.SUBMITTED };
      prismaMock.article.findUnique.mockResolvedValue(submittedArticle);
      prismaMock.article.update.mockResolvedValue({
        ...submittedArticle,
        status: ArticleStatus.PUBLISHED,
        publishedAt: new Date(),
      });

      const result = await service.publish('article-1', mockEditor.id, mockEditor.role);

      expect(result.status).toBe(ArticleStatus.PUBLISHED);
      expect(result.publishedAt).toBeDefined();
    });

    it('throws BadRequestException when not SUBMITTED', async () => {
      prismaMock.article.findUnique.mockResolvedValue(mockArticle); // DRAFT

      await expect(
        service.publish('article-1', mockEditor.id, mockEditor.role),
      ).rejects.toThrow(BadRequestException);
    });
  });

  // ── reject ──────────────────────────────────────────────────────────────────

  describe('reject', () => {
    it('transitions SUBMITTED → DRAFT with editor note in new Revision', async () => {
      const submittedArticle = { ...mockArticle, status: ArticleStatus.SUBMITTED };
      prismaMock.article.findUnique.mockResolvedValue(submittedArticle);
      prismaMock.revision.findFirst.mockResolvedValue(mockRevision);
      prismaMock.article.update.mockResolvedValue({ ...mockArticle, status: ArticleStatus.DRAFT });
      prismaMock.revision.create.mockResolvedValue({ ...mockRevision, editorNote: 'Needs work' });

      await service.reject('article-1', mockEditor.id, mockEditor.role, 'Needs work');

      expect(prismaMock.revision.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({ editorNote: 'Needs work' }),
        }),
      );
    });

    it('throws BadRequestException when not SUBMITTED', async () => {
      prismaMock.article.findUnique.mockResolvedValue(mockArticle); // DRAFT

      await expect(
        service.reject('article-1', mockEditor.id, mockEditor.role, 'note'),
      ).rejects.toThrow(BadRequestException);
    });
  });

  // ── archive ─────────────────────────────────────────────────────────────────

  describe('archive', () => {
    it('transitions PUBLISHED → ARCHIVED by owner', async () => {
      const publishedArticle = { ...mockArticle, status: ArticleStatus.PUBLISHED };
      prismaMock.article.findUnique.mockResolvedValue(publishedArticle);
      prismaMock.article.update.mockResolvedValue({ ...publishedArticle, status: ArticleStatus.ARCHIVED });

      const result = await service.archive('article-1', mockAuthor.id, mockAuthor.role);

      expect(result.status).toBe(ArticleStatus.ARCHIVED);
    });

    it('allows ADMIN to archive any article', async () => {
      const publishedArticle = { ...mockArticle, status: ArticleStatus.PUBLISHED };
      prismaMock.article.findUnique.mockResolvedValue(publishedArticle);
      prismaMock.article.update.mockResolvedValue({ ...publishedArticle, status: ArticleStatus.ARCHIVED });

      await expect(
        service.archive('article-1', mockAdmin.id, mockAdmin.role),
      ).resolves.not.toThrow();
    });

    it('throws ForbiddenException when non-owner non-admin tries to archive', async () => {
      const publishedArticle = { ...mockArticle, status: ArticleStatus.PUBLISHED };
      prismaMock.article.findUnique.mockResolvedValue(publishedArticle);

      await expect(
        service.archive('article-1', 'other-user', Role.WRITER),
      ).rejects.toThrow(ForbiddenException);
    });
  });
});
