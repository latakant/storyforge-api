import { Test, TestingModule } from '@nestjs/testing';
import { NotFoundException, ConflictException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { TagsService } from './tags.service';
import { PrismaService } from '../prisma/prisma.service';

// ─── Mock data ───────────────────────────────────────────────────────────────

const mockTag = {
  id: 'tag-1',
  name: 'TypeScript',
  slug: 'typescript',
  createdAt: new Date('2026-01-01'),
};

const prismaMock = {
  tag: {
    create: jest.fn(),
    findMany: jest.fn(),
    findUnique: jest.fn(),
    delete: jest.fn(),
  },
};

// ─── Tests ────────────────────────────────────────────────────────────────────

describe('TagsService', () => {
  let service: TagsService;

  beforeEach(async () => {
    jest.clearAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        TagsService,
        { provide: PrismaService, useValue: prismaMock },
      ],
    }).compile();

    service = module.get<TagsService>(TagsService);
  });

  // ── create ──────────────────────────────────────────────────────────────────

  describe('create', () => {
    it('creates tag and generates slug from name', async () => {
      prismaMock.tag.create.mockResolvedValue(mockTag);

      const result = await service.create({ name: 'TypeScript' });

      expect(result).toMatchObject({ name: 'TypeScript', slug: 'typescript' });
      const createCall = prismaMock.tag.create.mock.calls[0][0];
      expect(createCall.data.slug).toBe('typescript');
    });

    it('slugifies names with spaces and special chars', async () => {
      prismaMock.tag.create.mockResolvedValue({ ...mockTag, slug: 'node-js' });

      await service.create({ name: 'Node.js' });

      const createCall = prismaMock.tag.create.mock.calls[0][0];
      expect(createCall.data.slug).toBe('node-js');
    });

    it('throws ConflictException on duplicate tag name (P2002)', async () => {
      prismaMock.tag.create.mockRejectedValue(
        Object.assign(new Prisma.PrismaClientKnownRequestError('Unique constraint', {
          code: 'P2002',
          clientVersion: '6.0.0',
        }), {})
      );

      await expect(service.create({ name: 'TypeScript' })).rejects.toThrow(ConflictException);
    });
  });

  // ── findAll ─────────────────────────────────────────────────────────────────

  describe('findAll', () => {
    it('returns all tags with article counts', async () => {
      prismaMock.tag.findMany.mockResolvedValue([
        { ...mockTag, _count: { articles: 5 } },
      ]);

      const result = await service.findAll();

      expect(result).toHaveLength(1);
      expect(result[0]).toMatchObject({ name: 'TypeScript', articleCount: 5 });
    });

    it('returns empty array when no tags exist', async () => {
      prismaMock.tag.findMany.mockResolvedValue([]);

      const result = await service.findAll();

      expect(result).toEqual([]);
    });
  });

  // ── findBySlug ──────────────────────────────────────────────────────────────

  describe('findBySlug', () => {
    it('returns tag with article count', async () => {
      prismaMock.tag.findUnique.mockResolvedValue({ ...mockTag, _count: { articles: 3 } });

      const result = await service.findBySlug('typescript');

      expect(result).toMatchObject({ slug: 'typescript', articleCount: 3 });
    });

    it('throws NotFoundException for unknown slug', async () => {
      prismaMock.tag.findUnique.mockResolvedValue(null);

      await expect(service.findBySlug('ghost-tag')).rejects.toThrow(NotFoundException);
    });
  });

  // ── remove ──────────────────────────────────────────────────────────────────

  describe('remove', () => {
    it('deletes tag by id', async () => {
      prismaMock.tag.delete.mockResolvedValue(mockTag);

      await expect(service.remove('tag-1')).resolves.not.toThrow();
      expect(prismaMock.tag.delete).toHaveBeenCalledWith({ where: { id: 'tag-1' } });
    });

    it('throws NotFoundException when tag does not exist (P2025)', async () => {
      prismaMock.tag.delete.mockRejectedValue(
        new Prisma.PrismaClientKnownRequestError('Record not found', {
          code: 'P2025',
          clientVersion: '6.0.0',
        })
      );

      await expect(service.remove('ghost-id')).rejects.toThrow(NotFoundException);
    });
  });
});
