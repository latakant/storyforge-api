import { Test, TestingModule } from '@nestjs/testing';
import { NotFoundException, BadRequestException } from '@nestjs/common';
import { Role, ArticleStatus, CommentStatus } from '@prisma/client';
import { AdminService } from './admin.service';
import { PrismaService } from '../prisma/prisma.service';

// ─── Mock data ───────────────────────────────────────────────────────────────

const mockAdminUser = {
  id: 'admin-1',
  name: 'Admin User',
  email: 'admin@example.com',
  role: Role.ADMIN,
  isActive: true,
  createdAt: new Date('2026-01-01'),
  _count: { articles: 0, comments: 0 },
};

const mockWriterUser = {
  id: 'writer-1',
  name: 'Alice Writer',
  email: 'alice@example.com',
  role: Role.WRITER,
  isActive: true,
  createdAt: new Date('2026-01-02'),
  _count: { articles: 5, comments: 12 },
};

const mockPendingComment = {
  id: 'comment-1',
  body: 'Great post!',
  status: CommentStatus.PENDING,
  createdAt: new Date('2026-01-05'),
  author: { id: 'writer-1', name: 'Alice Writer' },
  article: { id: 'article-1', title: 'My Post', slug: 'my-post' },
};

const prismaMock = {
  user: {
    count: jest.fn(),
    findMany: jest.fn(),
    findUnique: jest.fn(),
    update: jest.fn(),
  },
  article: {
    count: jest.fn(),
  },
  comment: {
    count: jest.fn(),
    findMany: jest.fn(),
  },
  clap: {
    count: jest.fn(),
  },
};

// ─── Tests ────────────────────────────────────────────────────────────────────

describe('AdminService', () => {
  let service: AdminService;

  beforeEach(async () => {
    jest.clearAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AdminService,
        { provide: PrismaService, useValue: prismaMock },
      ],
    }).compile();

    service = module.get<AdminService>(AdminService);
  });

  // ── getStats ─────────────────────────────────────────────────────────────────

  describe('getStats', () => {
    it('returns platform-wide stats aggregated in parallel', async () => {
      prismaMock.user.count.mockResolvedValue(42);
      prismaMock.article.count
        .mockResolvedValueOnce(100)  // total
        .mockResolvedValueOnce(60)   // published
        .mockResolvedValueOnce(15)   // submitted
        .mockResolvedValueOnce(25);  // draft
      prismaMock.comment.count
        .mockResolvedValueOnce(200)  // total
        .mockResolvedValueOnce(8);   // pending
      prismaMock.clap.count.mockResolvedValue(500);

      const result = await service.getStats();

      expect(result).toEqual({
        users: 42,
        articles: { total: 100, published: 60, submitted: 15, draft: 25 },
        comments: { total: 200, pending: 8 },
        claps: 500,
      });
    });

    it('runs all 8 count queries in parallel', async () => {
      prismaMock.user.count.mockResolvedValue(0);
      prismaMock.article.count.mockResolvedValue(0);
      prismaMock.comment.count.mockResolvedValue(0);
      prismaMock.clap.count.mockResolvedValue(0);

      await service.getStats();

      // user.count called once, article.count called 4x, comment.count 2x, clap.count 1x
      expect(prismaMock.user.count).toHaveBeenCalledTimes(1);
      expect(prismaMock.article.count).toHaveBeenCalledTimes(4);
      expect(prismaMock.comment.count).toHaveBeenCalledTimes(2);
      expect(prismaMock.clap.count).toHaveBeenCalledTimes(1);
    });

    it('counts only active users', async () => {
      prismaMock.user.count.mockResolvedValue(10);
      prismaMock.article.count.mockResolvedValue(0);
      prismaMock.comment.count.mockResolvedValue(0);
      prismaMock.clap.count.mockResolvedValue(0);

      await service.getStats();

      expect(prismaMock.user.count).toHaveBeenCalledWith({ where: { isActive: true } });
    });
  });

  // ── listUsers ─────────────────────────────────────────────────────────────────

  describe('listUsers', () => {
    it('returns all users ordered by createdAt desc', async () => {
      prismaMock.user.findMany.mockResolvedValue([mockAdminUser, mockWriterUser]);

      const result = await service.listUsers();

      expect(result).toHaveLength(2);
      expect(result[0].email).toBe('admin@example.com');
      expect(prismaMock.user.findMany).toHaveBeenCalledWith(
        expect.objectContaining({ orderBy: { createdAt: 'desc' } }),
      );
    });

    it('returns empty array when no users', async () => {
      prismaMock.user.findMany.mockResolvedValue([]);

      const result = await service.listUsers();

      expect(result).toEqual([]);
    });
  });

  // ── changeRole ───────────────────────────────────────────────────────────────

  describe('changeRole', () => {
    it('updates the role of a target user', async () => {
      prismaMock.user.update.mockResolvedValue({ ...mockWriterUser, role: Role.EDITOR });

      const result = await service.changeRole('writer-1', Role.EDITOR, 'admin-1');

      expect(result.role).toBe(Role.EDITOR);
      expect(prismaMock.user.update).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: 'writer-1' },
          data: { role: Role.EDITOR },
        }),
      );
    });

    it('throws BadRequestException when admin tries to change their own role', async () => {
      await expect(
        service.changeRole('admin-1', Role.READER, 'admin-1'),
      ).rejects.toThrow(BadRequestException);

      expect(prismaMock.user.update).not.toHaveBeenCalled();
    });

    it('throws NotFoundException when user does not exist (P2025)', async () => {
      prismaMock.user.update.mockRejectedValue(new Error('Record not found'));

      await expect(
        service.changeRole('ghost-id', Role.EDITOR, 'admin-1'),
      ).rejects.toThrow(NotFoundException);
    });
  });

  // ── toggleUserStatus ──────────────────────────────────────────────────────────

  describe('toggleUserStatus', () => {
    it('deactivates an active user', async () => {
      prismaMock.user.findUnique.mockResolvedValue({ id: 'writer-1', isActive: true });
      prismaMock.user.update.mockResolvedValue({ ...mockWriterUser, isActive: false });

      const result = await service.toggleUserStatus('writer-1', 'admin-1');

      expect(prismaMock.user.update).toHaveBeenCalledWith(
        expect.objectContaining({ data: { isActive: false } }),
      );
      expect(result.isActive).toBe(false);
    });

    it('reactivates an inactive user', async () => {
      prismaMock.user.findUnique.mockResolvedValue({ id: 'writer-1', isActive: false });
      prismaMock.user.update.mockResolvedValue({ ...mockWriterUser, isActive: true });

      const result = await service.toggleUserStatus('writer-1', 'admin-1');

      expect(prismaMock.user.update).toHaveBeenCalledWith(
        expect.objectContaining({ data: { isActive: true } }),
      );
      expect(result.isActive).toBe(true);
    });

    it('throws BadRequestException when admin tries to deactivate themselves', async () => {
      await expect(
        service.toggleUserStatus('admin-1', 'admin-1'),
      ).rejects.toThrow(BadRequestException);

      expect(prismaMock.user.findUnique).not.toHaveBeenCalled();
    });

    it('throws NotFoundException when user does not exist', async () => {
      prismaMock.user.findUnique.mockResolvedValue(null);

      await expect(
        service.toggleUserStatus('ghost-id', 'admin-1'),
      ).rejects.toThrow(NotFoundException);

      expect(prismaMock.user.update).not.toHaveBeenCalled();
    });
  });

  // ── getPendingComments ────────────────────────────────────────────────────────

  describe('getPendingComments', () => {
    it('returns PENDING comments ordered oldest-first', async () => {
      prismaMock.comment.findMany.mockResolvedValue([mockPendingComment]);

      const result = await service.getPendingComments();

      expect(result).toHaveLength(1);
      expect(result[0].status).toBe(CommentStatus.PENDING);
      expect(result[0].author.name).toBe('Alice Writer');
      expect(result[0].article.slug).toBe('my-post');
      expect(prismaMock.comment.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { status: CommentStatus.PENDING },
          orderBy: { createdAt: 'asc' },
        }),
      );
    });

    it('returns empty array when no pending comments', async () => {
      prismaMock.comment.findMany.mockResolvedValue([]);

      const result = await service.getPendingComments();

      expect(result).toEqual([]);
    });
  });
});
