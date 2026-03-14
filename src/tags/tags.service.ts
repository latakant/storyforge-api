import {
  Injectable,
  NotFoundException,
  ConflictException,
} from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { CreateTagDto } from './dto/create-tag.dto';

export interface TagSummary {
  id: string;
  name: string;
  slug: string;
  createdAt: Date;
}

export interface TagDetail extends TagSummary {
  articleCount: number;
}

function slugifyTag(name: string): string {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .substring(0, 60);
}

@Injectable()
export class TagsService {
  constructor(private readonly prisma: PrismaService) {}

  async create(dto: CreateTagDto): Promise<TagSummary> {
    const slug = slugifyTag(dto.name);

    try {
      return await this.prisma.tag.create({
        data: { name: dto.name, slug },
        select: { id: true, name: true, slug: true, createdAt: true },
      });
    } catch (err) {
      if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === 'P2002') {
        throw new ConflictException(`Tag "${dto.name}" already exists`);
      }
      throw err;
    }
  }

  async findAll(): Promise<TagDetail[]> {
    const tags = await this.prisma.tag.findMany({
      orderBy: { name: 'asc' },
      select: {
        id: true,
        name: true,
        slug: true,
        createdAt: true,
        _count: { select: { articles: true } },
      },
    });

    return tags.map((t) => ({
      id: t.id,
      name: t.name,
      slug: t.slug,
      createdAt: t.createdAt,
      articleCount: t._count.articles,
    }));
  }

  async findBySlug(slug: string): Promise<TagDetail> {
    const tag = await this.prisma.tag.findUnique({
      where: { slug },
      select: {
        id: true,
        name: true,
        slug: true,
        createdAt: true,
        _count: { select: { articles: true } },
      },
    });

    if (!tag) throw new NotFoundException(`Tag "${slug}" not found`);

    return {
      id: tag.id,
      name: tag.name,
      slug: tag.slug,
      createdAt: tag.createdAt,
      articleCount: tag._count.articles,
    };
  }

  async remove(id: string): Promise<void> {
    try {
      await this.prisma.tag.delete({ where: { id } });
    } catch (err) {
      if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === 'P2025') {
        throw new NotFoundException('Tag not found');
      }
      throw err;
    }
  }
}
