import {
  Injectable,
  NotFoundException,
  ForbiddenException,
  BadRequestException,
} from '@nestjs/common';
import { CommentStatus, Role } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { CreateCommentDto } from './dto/create-comment.dto';

export interface CommentSummary {
  id: string;
  articleId: string;
  authorId: string;
  body: string;
  status: CommentStatus;
  parentId: string | null;
  createdAt: Date;
  updatedAt: Date;
}

@Injectable()
export class CommentsService {
  constructor(private readonly prisma: PrismaService) {}

  async create(
    articleId: string,
    dto: CreateCommentDto,
    authorId: string,
  ): Promise<CommentSummary> {
    // Verify the article exists and is PUBLISHED
    const article = await this.prisma.article.findUnique({
      where: { id: articleId },
      select: { id: true, status: true },
    });
    if (!article) throw new NotFoundException('Article not found');
    if (article.status !== 'PUBLISHED') {
      throw new BadRequestException('Cannot comment on an unpublished article');
    }

    // If replying, verify parent comment exists in same article
    if (dto.parentId) {
      const parent = await this.prisma.comment.findUnique({
        where: { id: dto.parentId },
        select: { id: true, articleId: true },
      });
      if (!parent || parent.articleId !== articleId) {
        throw new NotFoundException('Parent comment not found in this article');
      }
    }

    return this.prisma.comment.create({
      data: {
        articleId,
        authorId,
        body: dto.body,
        parentId: dto.parentId ?? null,
        status: CommentStatus.PENDING,
      },
      select: {
        id: true, articleId: true, authorId: true, body: true,
        status: true, parentId: true, createdAt: true, updatedAt: true,
      },
    });
  }

  async findAllForArticle(articleId: string): Promise<CommentSummary[]> {
    return this.prisma.comment.findMany({
      where: { articleId, status: CommentStatus.APPROVED, parentId: null },
      orderBy: { createdAt: 'asc' },
      select: {
        id: true, articleId: true, authorId: true, body: true,
        status: true, parentId: true, createdAt: true, updatedAt: true,
      },
    });
  }

  async approve(commentId: string, role: Role): Promise<CommentSummary> {
    this.assertEditorOrAdmin(role);
    return this.updateStatus(commentId, CommentStatus.APPROVED);
  }

  async reject(commentId: string, role: Role): Promise<CommentSummary> {
    this.assertEditorOrAdmin(role);
    return this.updateStatus(commentId, CommentStatus.REJECTED);
  }

  async remove(commentId: string, userId: string, role: Role): Promise<void> {
    const comment = await this.prisma.comment.findUnique({
      where: { id: commentId },
      select: { id: true, authorId: true },
    });
    if (!comment) throw new NotFoundException('Comment not found');

    if (role !== Role.ADMIN && comment.authorId !== userId) {
      throw new ForbiddenException('Only the author or an admin can delete this comment');
    }

    await this.prisma.comment.delete({ where: { id: commentId } });
  }

  // ─── Private helpers ──────────────────────────────────────────────────────

  private async updateStatus(
    commentId: string,
    status: CommentStatus,
  ): Promise<CommentSummary> {
    try {
      return await this.prisma.comment.update({
        where: { id: commentId },
        data: { status },
        select: {
          id: true, articleId: true, authorId: true, body: true,
          status: true, parentId: true, createdAt: true, updatedAt: true,
        },
      });
    } catch (err: unknown) {
      const prismaErr = err as { code?: string };
      if (prismaErr.code === 'P2025') throw new NotFoundException('Comment not found');
      throw err;
    }
  }

  private assertEditorOrAdmin(role: Role): void {
    if (role !== Role.EDITOR && role !== Role.ADMIN) {
      throw new ForbiddenException('Only editors or admins can moderate comments');
    }
  }
}
