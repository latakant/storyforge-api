import { Test, TestingModule } from '@nestjs/testing';
import {
  NotFoundException,
  ForbiddenException,
  BadRequestException,
} from '@nestjs/common';
import { CommentStatus, Role, ArticleStatus } from '@prisma/client';
import { CommentsService } from './comments.service';
import { PrismaService } from '../prisma/prisma.service';

// ─── Mock data ───────────────────────────────────────────────────────────────

const mockArticle = {
  id: 'article-1',
  status: ArticleStatus.PUBLISHED,
};

const mockComment = {
  id: 'comment-1',
  articleId: 'article-1',
  authorId: 'user-1',
  body: 'Great article!',
  status: CommentStatus.PENDING,
  parentId: null,
  createdAt: new Date('2026-01-01'),
  updatedAt: new Date('2026-01-01'),
};

const prismaMock = {
  article: { findUnique: jest.fn() },
  comment: {
    create: jest.fn(),
    findMany: jest.fn(),
    findUnique: jest.fn(),
    update: jest.fn(),
    delete: jest.fn(),
  },
};

// ─── Tests ────────────────────────────────────────────────────────────────────

describe('CommentsService', () => {
  let service: CommentsService;

  beforeEach(async () => {
    jest.clearAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        CommentsService,
        { provide: PrismaService, useValue: prismaMock },
      ],
    }).compile();

    service = module.get<CommentsService>(CommentsService);
  });

  // ── create ──────────────────────────────────────────────────────────────────

  describe('create', () => {
    it('creates comment as PENDING on a published article', async () => {
      prismaMock.article.findUnique.mockResolvedValue(mockArticle);
      prismaMock.comment.create.mockResolvedValue(mockComment);

      const result = await service.create(
        'article-1',
        { body: 'Great article!' },
        'user-1',
      );

      expect(result.status).toBe(CommentStatus.PENDING);
      expect(prismaMock.comment.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({ status: CommentStatus.PENDING }),
        }),
      );
    });

    it('throws NotFoundException when article does not exist', async () => {
      prismaMock.article.findUnique.mockResolvedValue(null);

      await expect(
        service.create('ghost-article', { body: 'hi' }, 'user-1'),
      ).rejects.toThrow(NotFoundException);
    });

    it('throws BadRequestException when article is not PUBLISHED', async () => {
      prismaMock.article.findUnique.mockResolvedValue({
        ...mockArticle,
        status: ArticleStatus.DRAFT,
      });

      await expect(
        service.create('article-1', { body: 'hi' }, 'user-1'),
      ).rejects.toThrow(BadRequestException);
    });

    it('throws NotFoundException when parent comment is not in the same article', async () => {
      prismaMock.article.findUnique.mockResolvedValue(mockArticle);
      prismaMock.comment.findUnique.mockResolvedValue({
        id: 'parent-1',
        articleId: 'different-article',
      });

      await expect(
        service.create('article-1', { body: 'reply', parentId: 'parent-1' }, 'user-1'),
      ).rejects.toThrow(NotFoundException);
    });
  });

  // ── findAllForArticle ────────────────────────────────────────────────────────

  describe('findAllForArticle', () => {
    it('returns only APPROVED top-level comments', async () => {
      const approvedComment = { ...mockComment, status: CommentStatus.APPROVED };
      prismaMock.comment.findMany.mockResolvedValue([approvedComment]);

      const result = await service.findAllForArticle('article-1');

      expect(result).toHaveLength(1);
      expect(prismaMock.comment.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            status: CommentStatus.APPROVED,
            parentId: null,
          }),
        }),
      );
    });
  });

  // ── approve ─────────────────────────────────────────────────────────────────

  describe('approve', () => {
    it('sets comment status to APPROVED', async () => {
      prismaMock.comment.update.mockResolvedValue({
        ...mockComment,
        status: CommentStatus.APPROVED,
      });

      const result = await service.approve('comment-1', Role.EDITOR);

      expect(result.status).toBe(CommentStatus.APPROVED);
    });

    it('throws ForbiddenException for WRITER role', async () => {
      await expect(service.approve('comment-1', Role.WRITER)).rejects.toThrow(ForbiddenException);
    });
  });

  // ── reject ──────────────────────────────────────────────────────────────────

  describe('reject', () => {
    it('sets comment status to REJECTED', async () => {
      prismaMock.comment.update.mockResolvedValue({
        ...mockComment,
        status: CommentStatus.REJECTED,
      });

      const result = await service.reject('comment-1', Role.ADMIN);

      expect(result.status).toBe(CommentStatus.REJECTED);
    });
  });

  // ── remove ──────────────────────────────────────────────────────────────────

  describe('remove', () => {
    it('allows author to delete their own comment', async () => {
      prismaMock.comment.findUnique.mockResolvedValue(mockComment);
      prismaMock.comment.delete.mockResolvedValue(mockComment);

      await expect(
        service.remove('comment-1', 'user-1', Role.READER),
      ).resolves.not.toThrow();
    });

    it('allows ADMIN to delete any comment', async () => {
      prismaMock.comment.findUnique.mockResolvedValue(mockComment);
      prismaMock.comment.delete.mockResolvedValue(mockComment);

      await expect(
        service.remove('comment-1', 'other-user', Role.ADMIN),
      ).resolves.not.toThrow();
    });

    it('throws ForbiddenException when non-author non-admin tries to delete', async () => {
      prismaMock.comment.findUnique.mockResolvedValue(mockComment); // authorId = user-1

      await expect(
        service.remove('comment-1', 'other-user', Role.READER),
      ).rejects.toThrow(ForbiddenException);
    });

    it('throws NotFoundException when comment does not exist', async () => {
      prismaMock.comment.findUnique.mockResolvedValue(null);

      await expect(
        service.remove('ghost-id', 'user-1', Role.ADMIN),
      ).rejects.toThrow(NotFoundException);
    });
  });
});
