import {
  Injectable,
  NotFoundException,
  ConflictException,
  BadRequestException,
} from '@nestjs/common';
import { Prisma, Role, ArticleStatus } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { UpdateProfileDto } from './dto/update-profile.dto';

export interface PublicProfile {
  id: string;
  name: string;
  bio: string | null;
  avatarUrl: string | null;
  role: Role;
  createdAt: Date;
  followerCount: number;
  followingCount: number;
}

export interface PrivateProfile {
  id: string;
  email: string;
  name: string;
  bio: string | null;
  avatarUrl: string | null;
  role: Role;
  updatedAt: Date;
}

export interface FollowResult {
  followerId: string;
  followingId: string;
  createdAt: Date;
}

export interface FeedArticle {
  id: string;
  slug: string;
  title: string;
  publishedAt: Date | null;
  coverImageUrl: string | null;
  authorId: string;
  createdAt: Date;
  updatedAt: Date;
  author: { id: string; name: string };
}

export interface PaginatedFeed {
  data: FeedArticle[];
  meta: { total: number; page: number; limit: number; totalPages: number };
}

@Injectable()
export class UsersService {
  constructor(private readonly prisma: PrismaService) {}

  async getProfile(username: string): Promise<PublicProfile> {
    // name is not unique in schema — use findFirst; a unique `username` field
    // should be added when slug-style usernames are introduced
    const user = await this.prisma.user.findFirst({
      where: { name: username, isActive: true },
      select: {
        id: true,
        name: true,
        bio: true,
        avatarUrl: true,
        role: true,
        createdAt: true,
      },
    });

    if (!user) throw new NotFoundException(`User "${username}" not found`);

    const [followerCount, followingCount] = await Promise.all([
      this.prisma.follow.count({ where: { followingId: user.id } }),
      this.prisma.follow.count({ where: { followerId: user.id } }),
    ]);

    return { ...user, followerCount, followingCount };
  }

  async updateProfile(userId: string, dto: UpdateProfileDto): Promise<PrivateProfile> {
    try {
      return await this.prisma.user.update({
        where: { id: userId },
        data: { ...dto },
        select: {
          id: true,
          email: true,
          name: true,
          bio: true,
          avatarUrl: true,
          role: true,
          updatedAt: true,
        },
      });
    } catch (err) {
      if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === 'P2025') {
        throw new NotFoundException('User not found');
      }
      throw err;
    }
  }

  async follow(followerId: string, followingId: string): Promise<FollowResult> {
    if (followerId === followingId) {
      throw new BadRequestException('Cannot follow yourself');
    }

    const target = await this.prisma.user.findUnique({
      where: { id: followingId },
      select: { id: true, isActive: true },
    });

    if (!target || !target.isActive) {
      throw new NotFoundException('User not found');
    }

    try {
      return await this.prisma.follow.create({
        data: { followerId, followingId },
        select: { followerId: true, followingId: true, createdAt: true },
      });
    } catch (err) {
      if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === 'P2002') {
        throw new ConflictException('Already following this user');
      }
      throw err;
    }
  }

  async unfollow(followerId: string, followingId: string): Promise<void> {
    await this.prisma.follow.deleteMany({
      where: { followerId, followingId },
    });
  }

  async getFeed(
    userId: string,
    page: number = 1,
    limit: number = 20,
  ): Promise<PaginatedFeed> {
    const skip = (page - 1) * limit;

    // Get IDs of users this person follows
    const follows = await this.prisma.follow.findMany({
      where: { followerId: userId },
      select: { followingId: true },
    });
    const followingIds = follows.map((f) => f.followingId);

    // Empty feed if not following anyone
    if (followingIds.length === 0) {
      return { data: [], meta: { total: 0, page, limit, totalPages: 0 } };
    }

    const where = {
      authorId: { in: followingIds },
      status: ArticleStatus.PUBLISHED,
    };

    const [data, total] = await Promise.all([
      this.prisma.article.findMany({
        where,
        skip,
        take: limit,
        orderBy: { publishedAt: 'desc' },
        select: {
          id: true, slug: true, title: true, publishedAt: true,
          coverImageUrl: true, authorId: true, createdAt: true, updatedAt: true,
          author: { select: { id: true, name: true } },
        },
      }),
      this.prisma.article.count({ where }),
    ]);

    return { data, meta: { total, page, limit, totalPages: Math.ceil(total / limit) } };
  }
}
