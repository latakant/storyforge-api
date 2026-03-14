import {
  Injectable,
  NotFoundException,
  ConflictException,
  BadRequestException,
} from '@nestjs/common';
import { Prisma, Role } from '@prisma/client';
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

@Injectable()
export class UsersService {
  constructor(private readonly prisma: PrismaService) {}

  async getProfile(username: string): Promise<PublicProfile> {
    const user = await this.prisma.user.findUnique({
      where: { name: username },
      select: {
        id: true,
        name: true,
        bio: true,
        avatarUrl: true,
        role: true,
        createdAt: true,
        _count: { select: { followers: true, following: true } },
      },
    });

    if (!user) throw new NotFoundException(`User "${username}" not found`);

    return {
      id: user.id,
      name: user.name,
      bio: user.bio,
      avatarUrl: user.avatarUrl,
      role: user.role,
      createdAt: user.createdAt,
      followerCount: user._count.followers,
      followingCount: user._count.following,
    };
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

    // Verify target user exists
    const target = await this.prisma.user.findUnique({
      where: { id: followingId },
      select: { id: true, isActive: true },
    });

    if (!target || !target.isActive) {
      throw new NotFoundException('User not found');
    }

    try {
      const follow = await this.prisma.follow.create({
        data: { followerId, followingId },
        select: { followerId: true, followingId: true, createdAt: true },
      });

      return follow;
    } catch (err) {
      if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === 'P2002') {
        throw new ConflictException('Already following this user');
      }
      throw err;
    }
  }

  async unfollow(followerId: string, followingId: string): Promise<void> {
    // Idempotent — deleteMany never throws if row missing
    await this.prisma.follow.deleteMany({
      where: { followerId, followingId },
    });
  }
}
