import {
  Injectable,
  NotFoundException,
  ForbiddenException,
  BadRequestException,
  ConflictException,
} from '@nestjs/common';
import { Prisma, ArticleStatus, Role } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { CreateArticleDto } from './dto/create-article.dto';
import { UpdateArticleDto } from './dto/update-article.dto';
import { ListArticlesDto } from './dto/list-articles.dto';

// State machine — only valid forward transitions
const VALID_TRANSITIONS: Partial<Record<ArticleStatus, ArticleStatus[]>> = {
  [ArticleStatus.DRAFT]:      [ArticleStatus.SUBMITTED],
  [ArticleStatus.SUBMITTED]:  [ArticleStatus.PUBLISHED, ArticleStatus.DRAFT],
  [ArticleStatus.PUBLISHED]:  [ArticleStatus.ARCHIVED],
};

function slugify(title: string): string {
  return title
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .substring(0, 80);
}

function generateSlug(title: string): string {
  const base = slugify(title);
  const suffix = Date.now().toString(36); // short unique suffix
  return `${base}-${suffix}`;
}

export interface ArticleSummary {
  id: string;
  slug: string;
  title: string;
  status: ArticleStatus;
  publishedAt: Date | null;
  coverImageUrl: string | null;
  authorId: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface ArticleDetail extends ArticleSummary {
  latestContent: string | null;
  author: { id: string; name: string };
  tags: { id: string; name: string; slug: string }[];
  clapCount: number;
}

export interface RevisionSummary {
  id: string;
  articleId: string;
  content: string;
  editorNote: string | null;
  createdAt: Date;
}

export interface PaginatedArticles {
  data: ArticleSummary[];
  meta: { total: number; page: number; limit: number; totalPages: number };
}

@Injectable()
export class ArticlesService {
  constructor(private readonly prisma: PrismaService) {}

  async create(dto: CreateArticleDto, authorId: string): Promise<ArticleSummary> {
    const slug = generateSlug(dto.title);

    try {
      const article = await this.prisma.$transaction(async (tx) => {
        const created = await tx.article.create({
          data: {
            authorId,
            slug,
            title: dto.title,
            coverImageUrl: dto.coverImageUrl,
            status: ArticleStatus.DRAFT,
          },
        });

        // First revision = initial content (append-only from the start)
        await tx.revision.create({
          data: { articleId: created.id, content: dto.content },
        });

        return created;
      });

      return article;
    } catch (err) {
      if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === 'P2002') {
        throw new ConflictException('Slug collision — please try again');
      }
      throw err;
    }
  }

  async findAll(dto: ListArticlesDto): Promise<PaginatedArticles> {
    const { page = 1, limit = 20, tag, author } = dto;
    const skip = (page - 1) * limit;

    const where: Prisma.ArticleWhereInput = {
      status: ArticleStatus.PUBLISHED,
      ...(tag && { tags: { some: { tag: { slug: tag } } } }),
      ...(author && { author: { name: author } }),
    };

    const [data, total] = await Promise.all([
      this.prisma.article.findMany({
        where,
        skip,
        take: limit,
        orderBy: { publishedAt: 'desc' },
        select: {
          id: true, slug: true, title: true, status: true,
          publishedAt: true, coverImageUrl: true, authorId: true,
          createdAt: true, updatedAt: true,
        },
      }),
      this.prisma.article.count({ where }),
    ]);

    return { data, meta: { total, page, limit, totalPages: Math.ceil(total / limit) } };
  }

  async findBySlug(slug: string): Promise<ArticleDetail> {
    const article = await this.prisma.article.findUnique({
      where: { slug },
      include: {
        author: { select: { id: true, name: true } },
        revisions: { orderBy: { createdAt: 'desc' }, take: 1 },
        tags: { include: { tag: { select: { id: true, name: true, slug: true } } } },
        _count: { select: { claps: true } },
      },
    });

    if (!article) throw new NotFoundException(`Article "${slug}" not found`);

    const latestRevision = article.revisions[0] ?? null;

    return {
      id: article.id,
      slug: article.slug,
      title: article.title,
      status: article.status,
      publishedAt: article.publishedAt,
      coverImageUrl: article.coverImageUrl,
      authorId: article.authorId,
      createdAt: article.createdAt,
      updatedAt: article.updatedAt,
      latestContent: latestRevision?.content ?? null,
      author: article.author,
      tags: article.tags.map((at) => at.tag),
      clapCount: article._count.claps,
    };
  }

  async update(id: string, dto: UpdateArticleDto, userId: string): Promise<ArticleSummary> {
    const article = await this.getArticleOrThrow(id);
    this.assertOwner(article, userId);

    const { tagIds, ...rest } = dto;

    try {
      return await this.prisma.article.update({
        where: { id },
        data: {
          ...rest,
          ...(tagIds !== undefined && {
            tags: {
              deleteMany: {},
              create: tagIds.map((tagId) => ({ tagId })),
            },
          }),
        },
        select: {
          id: true, slug: true, title: true, status: true,
          publishedAt: true, coverImageUrl: true, authorId: true,
          createdAt: true, updatedAt: true,
        },
      });
    } catch (err) {
      if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === 'P2025') {
        throw new NotFoundException('Article not found');
      }
      throw err;
    }
  }

  async saveContent(
    articleId: string,
    content: string,
    userId: string,
  ): Promise<RevisionSummary> {
    const article = await this.getArticleOrThrow(articleId);
    this.assertOwner(article, userId);

    // HARD HALT: slug is locked, content is frozen for PUBLISHED articles
    if (article.status === ArticleStatus.PUBLISHED) {
      throw new BadRequestException('Cannot edit a published article');
    }

    // INVARIANT: always INSERT new Revision — never UPDATE article content
    return this.prisma.revision.create({
      data: { articleId, content },
      select: { id: true, articleId: true, content: true, editorNote: true, createdAt: true },
    });
  }

  async submit(articleId: string, userId: string): Promise<ArticleSummary> {
    const article = await this.getArticleOrThrow(articleId);
    this.assertOwner(article, userId);
    this.assertTransition(article.status, ArticleStatus.SUBMITTED);

    // Must have at least one revision before submitting
    const hasContent = await this.prisma.revision.findFirst({ where: { articleId } });
    if (!hasContent) {
      throw new BadRequestException('Cannot submit article without content — add content first');
    }

    return this.prisma.article.update({
      where: { id: articleId },
      data: { status: ArticleStatus.SUBMITTED },
      select: {
        id: true, slug: true, title: true, status: true,
        publishedAt: true, coverImageUrl: true, authorId: true,
        createdAt: true, updatedAt: true,
      },
    });
  }

  async publish(articleId: string, userId: string, role: Role): Promise<ArticleSummary> {
    this.assertEditorOrAdmin(role);
    const article = await this.getArticleOrThrow(articleId);
    this.assertTransition(article.status, ArticleStatus.PUBLISHED);

    // Slug is now permanently locked — publishedAt set once, never changed
    return this.prisma.article.update({
      where: { id: articleId },
      data: { status: ArticleStatus.PUBLISHED, publishedAt: new Date() },
      select: {
        id: true, slug: true, title: true, status: true,
        publishedAt: true, coverImageUrl: true, authorId: true,
        createdAt: true, updatedAt: true,
      },
    });
  }

  async reject(
    articleId: string,
    userId: string,
    role: Role,
    editorNote: string,
  ): Promise<ArticleSummary> {
    this.assertEditorOrAdmin(role);
    const article = await this.getArticleOrThrow(articleId);
    this.assertTransition(article.status, ArticleStatus.DRAFT);

    // Find latest revision to copy content into rejection revision
    const latestRevision = await this.prisma.revision.findFirst({
      where: { articleId },
      orderBy: { createdAt: 'desc' },
    });

    const [updated] = await this.prisma.$transaction([
      this.prisma.article.update({
        where: { id: articleId },
        data: { status: ArticleStatus.DRAFT },
        select: {
          id: true, slug: true, title: true, status: true,
          publishedAt: true, coverImageUrl: true, authorId: true,
          createdAt: true, updatedAt: true,
        },
      }),
      // Append rejection as a new revision with the editor note
      this.prisma.revision.create({
        data: {
          articleId,
          content: latestRevision?.content ?? '',
          editorNote,
        },
      }),
    ]);

    return updated;
  }

  async archive(articleId: string, userId: string, role: Role): Promise<ArticleSummary> {
    const article = await this.getArticleOrThrow(articleId);

    if (role !== Role.ADMIN && article.authorId !== userId) {
      throw new ForbiddenException('Only the author or an admin can archive this article');
    }

    this.assertTransition(article.status, ArticleStatus.ARCHIVED);

    return this.prisma.article.update({
      where: { id: articleId },
      data: { status: ArticleStatus.ARCHIVED },
      select: {
        id: true, slug: true, title: true, status: true,
        publishedAt: true, coverImageUrl: true, authorId: true,
        createdAt: true, updatedAt: true,
      },
    });
  }

  async getRevisions(articleId: string, userId: string, role: Role): Promise<RevisionSummary[]> {
    const article = await this.getArticleOrThrow(articleId);

    const isOwner = article.authorId === userId;
    const isPrivileged = role === Role.EDITOR || role === Role.ADMIN;

    if (!isOwner && !isPrivileged) {
      throw new ForbiddenException('Only the author or editors can view revision history');
    }

    return this.prisma.revision.findMany({
      where: { articleId },
      orderBy: { createdAt: 'desc' },
      select: { id: true, articleId: true, content: true, editorNote: true, createdAt: true },
    });
  }

  // ─── Private helpers ──────────────────────────────────────────────────────

  private async getArticleOrThrow(id: string): Promise<ArticleSummary> {
    const article = await this.prisma.article.findUnique({
      where: { id },
      select: {
        id: true, slug: true, title: true, status: true,
        publishedAt: true, coverImageUrl: true, authorId: true,
        createdAt: true, updatedAt: true,
      },
    });

    if (!article) throw new NotFoundException('Article not found');
    return article;
  }

  private assertOwner(article: ArticleSummary, userId: string): void {
    if (article.authorId !== userId) {
      throw new ForbiddenException('Only the author can perform this action');
    }
  }

  private assertEditorOrAdmin(role: Role): void {
    if (role !== Role.EDITOR && role !== Role.ADMIN) {
      throw new ForbiddenException('Only editors or admins can perform this action');
    }
  }

  private assertTransition(current: ArticleStatus, target: ArticleStatus): void {
    const allowed = VALID_TRANSITIONS[current] ?? [];
    if (!allowed.includes(target)) {
      throw new BadRequestException(
        `Cannot transition from ${current} to ${target}`,
      );
    }
  }
}
