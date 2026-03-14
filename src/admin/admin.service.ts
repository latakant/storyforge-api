import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { Role, ArticleStatus, CommentStatus } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';

export interface AdminUser {
  id: string;
  name: string;
  email: string;
  role: Role;
  isActive: boolean;
  createdAt: Date;
  _count: { articles: number; comments: number };
}

export interface AdminStats {
  users: number;
  articles: { total: number; published: number; submitted: number; draft: number };
  comments: { total: number; pending: number };
  claps: number;
}

export interface PendingComment {
  id: string;
  body: string;
  status: CommentStatus;
  createdAt: Date;
  author: { id: string; name: string };
  article: { id: string; title: string; slug: string };
}

@Injectable()
export class AdminService {
  constructor(private readonly prisma: PrismaService) {}

  async getStats(): Promise<AdminStats> {
    const [
      users,
      totalArticles, publishedArticles, submittedArticles, draftArticles,
      totalComments, pendingComments,
      claps,
    ] = await Promise.all([
      this.prisma.user.count({ where: { isActive: true } }),
      this.prisma.article.count(),
      this.prisma.article.count({ where: { status: ArticleStatus.PUBLISHED } }),
      this.prisma.article.count({ where: { status: ArticleStatus.SUBMITTED } }),
      this.prisma.article.count({ where: { status: ArticleStatus.DRAFT } }),
      this.prisma.comment.count(),
      this.prisma.comment.count({ where: { status: CommentStatus.PENDING } }),
      this.prisma.clap.count(),
    ]);

    return {
      users,
      articles: { total: totalArticles, published: publishedArticles, submitted: submittedArticles, draft: draftArticles },
      comments: { total: totalComments, pending: pendingComments },
      claps,
    };
  }

  async listUsers(): Promise<AdminUser[]> {
    return this.prisma.user.findMany({
      orderBy: { createdAt: 'desc' },
      select: {
        id: true, name: true, email: true, role: true,
        isActive: true, createdAt: true,
        _count: { select: { articles: true, comments: true } },
      },
    });
  }

  async changeRole(userId: string, role: Role, requesterId: string): Promise<AdminUser> {
    if (userId === requesterId) {
      throw new BadRequestException('Cannot change your own role');
    }

    try {
      return await this.prisma.user.update({
        where: { id: userId },
        data: { role },
        select: {
          id: true, name: true, email: true, role: true,
          isActive: true, createdAt: true,
          _count: { select: { articles: true, comments: true } },
        },
      });
    } catch {
      throw new NotFoundException('User not found');
    }
  }

  async toggleUserStatus(userId: string, requesterId: string): Promise<AdminUser> {
    if (userId === requesterId) {
      throw new BadRequestException('Cannot deactivate yourself');
    }

    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { id: true, isActive: true },
    });
    if (!user) throw new NotFoundException('User not found');

    return this.prisma.user.update({
      where: { id: userId },
      data: { isActive: !user.isActive },
      select: {
        id: true, name: true, email: true, role: true,
        isActive: true, createdAt: true,
        _count: { select: { articles: true, comments: true } },
      },
    });
  }

  async getPendingComments(): Promise<PendingComment[]> {
    return this.prisma.comment.findMany({
      where: { status: CommentStatus.PENDING },
      orderBy: { createdAt: 'asc' },
      select: {
        id: true, body: true, status: true, createdAt: true,
        author: { select: { id: true, name: true } },
        article: { select: { id: true, title: true, slug: true } },
      },
    });
  }
}
