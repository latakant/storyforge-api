import { Injectable } from '@nestjs/common';
import { ArticleStatus } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';

export interface DiscoveryArticle {
  id: string;
  slug: string;
  title: string;
  publishedAt: Date | null;
  coverImageUrl: string | null;
  authorId: string;
  createdAt: Date;
  updatedAt: Date;
  author: { id: string; name: string };
  clapCount: number;
}

export interface DiscoveryTag {
  id: string;
  name: string;
  slug: string;
  articleCount: number;
}

export interface PaginatedDiscovery {
  data: DiscoveryArticle[];
  meta: { total: number; page: number; limit: number; totalPages: number };
}

@Injectable()
export class DiscoveryService {
  constructor(private readonly prisma: PrismaService) {}

  async listArticles(
    page: number = 1,
    limit: number = 20,
    tag?: string,
  ): Promise<PaginatedDiscovery> {
    const skip = (page - 1) * limit;

    const where = {
      status: ArticleStatus.PUBLISHED,
      ...(tag && { tags: { some: { tag: { slug: tag } } } }),
    };

    const [articles, total] = await Promise.all([
      this.prisma.article.findMany({
        where,
        skip,
        take: limit,
        orderBy: { publishedAt: 'desc' },
        select: {
          id: true, slug: true, title: true, publishedAt: true,
          coverImageUrl: true, authorId: true, createdAt: true, updatedAt: true,
          author: { select: { id: true, name: true } },
          _count: { select: { claps: true } },
        },
      }),
      this.prisma.article.count({ where }),
    ]);

    const data: DiscoveryArticle[] = articles.map((a) => ({
      id: a.id,
      slug: a.slug,
      title: a.title,
      publishedAt: a.publishedAt,
      coverImageUrl: a.coverImageUrl,
      authorId: a.authorId,
      createdAt: a.createdAt,
      updatedAt: a.updatedAt,
      author: a.author,
      clapCount: a._count.claps,
    }));

    return { data, meta: { total, page, limit, totalPages: Math.ceil(total / limit) } };
  }

  async listTags(): Promise<DiscoveryTag[]> {
    const tags = await this.prisma.tag.findMany({
      orderBy: { name: 'asc' },
      select: {
        id: true,
        name: true,
        slug: true,
        _count: { select: { articles: true } },
      },
    });

    return tags.map((t) => ({
      id: t.id,
      name: t.name,
      slug: t.slug,
      articleCount: t._count.articles,
    }));
  }

  async trending(limit: number = 10): Promise<DiscoveryArticle[]> {
    // Trending = most claps among PUBLISHED articles in last 30 days
    const since = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);

    const articles = await this.prisma.article.findMany({
      where: {
        status: ArticleStatus.PUBLISHED,
        publishedAt: { gte: since },
      },
      take: limit,
      orderBy: { claps: { _count: 'desc' } },
      select: {
        id: true, slug: true, title: true, publishedAt: true,
        coverImageUrl: true, authorId: true, createdAt: true, updatedAt: true,
        author: { select: { id: true, name: true } },
        _count: { select: { claps: true } },
      },
    });

    return articles.map((a) => ({
      id: a.id,
      slug: a.slug,
      title: a.title,
      publishedAt: a.publishedAt,
      coverImageUrl: a.coverImageUrl,
      authorId: a.authorId,
      createdAt: a.createdAt,
      updatedAt: a.updatedAt,
      author: a.author,
      clapCount: a._count.claps,
    }));
  }
}
