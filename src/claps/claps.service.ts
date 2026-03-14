import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

export interface ClapResult {
  articleId: string;
  clapCount: number;
}

@Injectable()
export class ClapsService {
  constructor(private readonly prisma: PrismaService) {}

  async clap(articleId: string, userId: string): Promise<ClapResult> {
    // Verify article exists and is PUBLISHED
    const article = await this.prisma.article.findUnique({
      where: { id: articleId },
      select: { id: true, status: true },
    });
    if (!article) throw new NotFoundException('Article not found');
    if (article.status !== 'PUBLISHED') {
      throw new NotFoundException('Article not found');
    }

    // Append-only event — each call is a new Clap (users can clap multiple times)
    await this.prisma.clap.create({
      data: { articleId, userId },
    });

    const clapCount = await this.prisma.clap.count({ where: { articleId } });
    return { articleId, clapCount };
  }

  async getCount(articleId: string): Promise<ClapResult> {
    const article = await this.prisma.article.findUnique({
      where: { id: articleId },
      select: { id: true },
    });
    if (!article) throw new NotFoundException('Article not found');

    const clapCount = await this.prisma.clap.count({ where: { articleId } });
    return { articleId, clapCount };
  }
}
