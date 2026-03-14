import { Test, TestingModule } from '@nestjs/testing';
import { ConflictException, NotFoundException, BadRequestException } from '@nestjs/common';
import { Prisma, Role } from '@prisma/client';
import { UsersService } from './users.service';
import { PrismaService } from '../prisma/prisma.service';

// ─── Mock data ───────────────────────────────────────────────────────────────

const mockUser = {
  id: 'user-cuid-1',
  email: 'writer@example.com',
  name: 'Alice Writer',
  bio: 'I write things.',
  avatarUrl: null,
  role: Role.WRITER,
  isActive: true,
  createdAt: new Date('2026-01-01'),
  updatedAt: new Date('2026-01-01'),
};

const publicProfile = {
  id: mockUser.id,
  name: mockUser.name,
  bio: mockUser.bio,
  avatarUrl: mockUser.avatarUrl,
  role: mockUser.role,
  createdAt: mockUser.createdAt,
  _count: { followers: 5, following: 2 },
};

const mockFeedArticle = {
  id: 'article-1',
  slug: 'great-post',
  title: 'Great Post',
  publishedAt: new Date('2026-02-01'),
  coverImageUrl: null,
  authorId: 'followed-user-id',
  createdAt: new Date('2026-02-01'),
  updatedAt: new Date('2026-02-01'),
  author: { id: 'followed-user-id', name: 'Bob' },
};

const prismaMock = {
  user: {
    findFirst: jest.fn(),
    findUnique: jest.fn(),
    update: jest.fn(),
  },
  follow: {
    create: jest.fn(),
    count: jest.fn(),
    deleteMany: jest.fn(),
    findMany: jest.fn(),
  },
  article: {
    findMany: jest.fn(),
    count: jest.fn(),
  },
};

// ─── Tests ────────────────────────────────────────────────────────────────────

describe('UsersService', () => {
  let service: UsersService;

  beforeEach(async () => {
    jest.clearAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        UsersService,
        { provide: PrismaService, useValue: prismaMock },
      ],
    }).compile();

    service = module.get<UsersService>(UsersService);
  });

  // ── getProfile ──────────────────────────────────────────────────────────────

  describe('getProfile', () => {
    it('returns public profile for existing username', async () => {
      prismaMock.user.findFirst.mockResolvedValue({
        id: mockUser.id,
        name: mockUser.name,
        bio: mockUser.bio,
        avatarUrl: mockUser.avatarUrl,
        role: mockUser.role,
        createdAt: mockUser.createdAt,
      });
      prismaMock.follow.count.mockResolvedValueOnce(5).mockResolvedValueOnce(2);

      const result = await service.getProfile('alice-writer');

      expect(prismaMock.user.findFirst).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({ name: 'alice-writer' }),
        }),
      );
      expect(result).toMatchObject({
        id: mockUser.id,
        name: mockUser.name,
        followerCount: 5,
        followingCount: 2,
      });
      // Must not expose sensitive fields
      expect(result).not.toHaveProperty('email');
      expect(result).not.toHaveProperty('passwordHash');
    });

    it('throws NotFoundException for unknown username', async () => {
      prismaMock.user.findFirst.mockResolvedValue(null);

      await expect(service.getProfile('ghost')).rejects.toThrow(NotFoundException);
    });
  });

  // ── updateProfile ───────────────────────────────────────────────────────────

  describe('updateProfile', () => {
    it('updates profile fields for own user', async () => {
      const updated = { ...mockUser, bio: 'Updated bio', updatedAt: new Date() };
      prismaMock.user.update.mockResolvedValue(updated);

      const result = await service.updateProfile(mockUser.id, { bio: 'Updated bio' });

      expect(prismaMock.user.update).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: mockUser.id },
          data: expect.objectContaining({ bio: 'Updated bio' }),
        }),
      );
      expect(result.bio).toBe('Updated bio');
    });

    it('throws NotFoundException if user not found (P2025)', async () => {
      const p2025 = new Prisma.PrismaClientKnownRequestError('Not found', {
        code: 'P2025',
        clientVersion: '6.0.0',
      });
      prismaMock.user.update.mockRejectedValue(p2025);

      await expect(
        service.updateProfile('nonexistent-id', { name: 'X' }),
      ).rejects.toThrow(NotFoundException);
    });
  });

  // ── follow ──────────────────────────────────────────────────────────────────

  describe('follow', () => {
    it('creates a follow relation', async () => {
      prismaMock.user.findUnique.mockResolvedValue(mockUser);
      prismaMock.follow.create.mockResolvedValue({
        id: 'f-1',
        followerId: 'follower-id',
        followingId: mockUser.id,
        createdAt: new Date(),
      });

      const result = await service.follow('follower-id', mockUser.id);

      expect(prismaMock.follow.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: { followerId: 'follower-id', followingId: mockUser.id },
        }),
      );
      expect(result).toMatchObject({ followerId: 'follower-id', followingId: mockUser.id });
    });

    it('throws BadRequestException when following self', async () => {
      await expect(service.follow(mockUser.id, mockUser.id)).rejects.toThrow(BadRequestException);
    });

    it('throws NotFoundException when target user does not exist', async () => {
      prismaMock.user.findUnique.mockResolvedValue(null);

      await expect(service.follow('follower-id', 'ghost-id')).rejects.toThrow(NotFoundException);
    });

    it('throws ConflictException when already following (P2002)', async () => {
      prismaMock.user.findUnique.mockResolvedValue(mockUser);
      const p2002 = new Prisma.PrismaClientKnownRequestError('Unique constraint', {
        code: 'P2002',
        clientVersion: '6.0.0',
      });
      prismaMock.follow.create.mockRejectedValue(p2002);

      await expect(service.follow('follower-id', mockUser.id)).rejects.toThrow(ConflictException);
    });
  });

  // ── unfollow ────────────────────────────────────────────────────────────────

  describe('unfollow', () => {
    it('deletes follow relation (idempotent — no throw if not found)', async () => {
      prismaMock.follow.deleteMany.mockResolvedValue({ count: 1 });

      await service.unfollow('follower-id', mockUser.id);

      expect(prismaMock.follow.deleteMany).toHaveBeenCalledWith({
        where: { followerId: 'follower-id', followingId: mockUser.id },
      });
    });

    it('does not throw when follow does not exist', async () => {
      prismaMock.follow.deleteMany.mockResolvedValue({ count: 0 });

      await expect(service.unfollow('follower-id', 'not-following-id')).resolves.not.toThrow();
    });
  });

  // ── getFeed ─────────────────────────────────────────────────────────────────

  describe('getFeed', () => {
    it('returns paginated articles from followed writers', async () => {
      prismaMock.follow.findMany.mockResolvedValue([{ followingId: 'followed-user-id' }]);
      prismaMock.article.findMany.mockResolvedValue([mockFeedArticle]);
      prismaMock.article.count.mockResolvedValue(1);

      const result = await service.getFeed('user-1');

      expect(result.data).toHaveLength(1);
      expect(result.data[0]).toMatchObject({ slug: 'great-post', author: { name: 'Bob' } });
      expect(result.meta).toMatchObject({ total: 1, page: 1, limit: 20 });
    });

    it('returns empty feed when user follows nobody', async () => {
      prismaMock.follow.findMany.mockResolvedValue([]);

      const result = await service.getFeed('user-1');

      expect(result.data).toEqual([]);
      expect(result.meta.total).toBe(0);
      expect(prismaMock.article.findMany).not.toHaveBeenCalled();
    });

    it('queries only PUBLISHED articles from followed authors', async () => {
      prismaMock.follow.findMany.mockResolvedValue([{ followingId: 'author-id' }]);
      prismaMock.article.findMany.mockResolvedValue([]);
      prismaMock.article.count.mockResolvedValue(0);

      await service.getFeed('user-1', 1, 20);

      const whereArg = prismaMock.article.findMany.mock.calls[0][0].where;
      expect(whereArg.authorId).toEqual({ in: ['author-id'] });
      expect(whereArg.status).toBe('PUBLISHED');
    });
  });
});
