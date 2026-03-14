import { Test, TestingModule } from '@nestjs/testing';
import { ConflictException, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { Prisma, Role } from '@prisma/client';
import * as bcrypt from 'bcrypt';
import { AuthService } from './auth.service';
import { PrismaService } from '../prisma/prisma.service';

// ─── Mocks ────────────────────────────────────────────────────────────────────

const mockUser = {
  id: 'user-cuid-1',
  email: 'writer@example.com',
  role: Role.WRITER,
  passwordHash: '$2b$12$validhashhere',
  isActive: true,
};

const mockRefreshToken = {
  id: 'rt-cuid-1',
  token: 'opaque-refresh-token',
  userId: mockUser.id,
  expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
  user: { id: mockUser.id, email: mockUser.email, role: mockUser.role, isActive: true },
};

const prismaMock = {
  user: {
    create: jest.fn(),
    findUnique: jest.fn(),
  },
  refreshToken: {
    create: jest.fn(),
    findUnique: jest.fn(),
    deleteMany: jest.fn(),
  },
};

const jwtMock = {
  sign: jest.fn().mockReturnValue('signed-access-token'),
  verify: jest.fn(),
};

const configMock = {
  getOrThrow: jest.fn((key: string) => {
    const values: Record<string, string> = {
      JWT_SECRET: 'test-secret',
      JWT_REFRESH_SECRET: 'test-refresh-secret',
    };
    return values[key];
  }),
  get: jest.fn().mockReturnValue('15m'),
};

// ─── Tests ────────────────────────────────────────────────────────────────────

describe('AuthService', () => {
  let service: AuthService;

  beforeEach(async () => {
    jest.clearAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AuthService,
        { provide: PrismaService, useValue: prismaMock },
        { provide: JwtService, useValue: jwtMock },
        { provide: ConfigService, useValue: configMock },
      ],
    }).compile();

    service = module.get<AuthService>(AuthService);
  });

  // ── register ────────────────────────────────────────────────────────────────

  describe('register', () => {
    it('creates user with READER role and returns token pair', async () => {
      prismaMock.user.create.mockResolvedValue({
        id: mockUser.id,
        email: mockUser.email,
        role: Role.READER,
      });
      prismaMock.refreshToken.create.mockResolvedValue(mockRefreshToken);

      const result = await service.register({
        email: 'new@example.com',
        password: 'password123',
        name: 'New User',
      });

      expect(prismaMock.user.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            email: 'new@example.com',
            role: Role.READER,
          }),
        }),
      );
      expect(result).toHaveProperty('accessToken');
      expect(result).toHaveProperty('refreshToken');
    });

    it('lowercases email before saving', async () => {
      prismaMock.user.create.mockResolvedValue({ id: 'u1', email: 'user@example.com', role: Role.READER });
      prismaMock.refreshToken.create.mockResolvedValue(mockRefreshToken);

      await service.register({ email: 'USER@EXAMPLE.COM', password: 'password123', name: 'Test' });

      expect(prismaMock.user.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({ email: 'user@example.com' }),
        }),
      );
    });

    it('throws ConflictException on duplicate email (P2002)', async () => {
      const p2002 = new Prisma.PrismaClientKnownRequestError('Unique constraint failed', {
        code: 'P2002',
        clientVersion: '6.0.0',
      });
      prismaMock.user.create.mockRejectedValue(p2002);

      await expect(
        service.register({ email: 'dupe@example.com', password: 'password123', name: 'Dupe' }),
      ).rejects.toThrow(ConflictException);
    });

    it('hashes password with bcrypt before storing', async () => {
      prismaMock.user.create.mockResolvedValue({ id: 'u1', email: 'u@e.com', role: Role.READER });
      prismaMock.refreshToken.create.mockResolvedValue(mockRefreshToken);

      const spy = jest.spyOn(bcrypt, 'hash');

      await service.register({ email: 'u@e.com', password: 'plaintext', name: 'U' });

      expect(spy).toHaveBeenCalledWith('plaintext', 12);
    });
  });

  // ── login ───────────────────────────────────────────────────────────────────

  describe('login', () => {
    it('returns token pair for valid credentials', async () => {
      const hash = await bcrypt.hash('correctpassword', 12);
      prismaMock.user.findUnique.mockResolvedValue({ ...mockUser, passwordHash: hash });
      prismaMock.refreshToken.create.mockResolvedValue(mockRefreshToken);

      const result = await service.login({ email: mockUser.email, password: 'correctpassword' });

      expect(result).toHaveProperty('accessToken');
      expect(result).toHaveProperty('refreshToken');
    });

    it('throws UnauthorizedException for wrong password', async () => {
      const hash = await bcrypt.hash('correctpassword', 12);
      prismaMock.user.findUnique.mockResolvedValue({ ...mockUser, passwordHash: hash });

      await expect(
        service.login({ email: mockUser.email, password: 'wrongpassword' }),
      ).rejects.toThrow(UnauthorizedException);
    });

    it('throws UnauthorizedException when user not found', async () => {
      prismaMock.user.findUnique.mockResolvedValue(null);

      await expect(
        service.login({ email: 'ghost@example.com', password: 'password123' }),
      ).rejects.toThrow(UnauthorizedException);
    });

    it('throws UnauthorizedException for inactive user', async () => {
      const hash = await bcrypt.hash('password123', 12);
      prismaMock.user.findUnique.mockResolvedValue({ ...mockUser, passwordHash: hash, isActive: false });

      await expect(
        service.login({ email: mockUser.email, password: 'password123' }),
      ).rejects.toThrow(UnauthorizedException);
    });
  });

  // ── refresh ─────────────────────────────────────────────────────────────────

  describe('refresh', () => {
    it('returns new access token for valid refresh token', async () => {
      jwtMock.verify.mockReturnValue({ sub: mockUser.id, type: 'refresh' });
      prismaMock.refreshToken.findUnique.mockResolvedValue(mockRefreshToken);

      const result = await service.refresh('valid-refresh-token');

      expect(result).toHaveProperty('accessToken');
    });

    it('throws UnauthorizedException if JWT verify fails', async () => {
      jwtMock.verify.mockImplementation(() => { throw new Error('expired'); });

      await expect(service.refresh('bad-token')).rejects.toThrow(UnauthorizedException);
    });

    it('throws UnauthorizedException if token type is not refresh', async () => {
      jwtMock.verify.mockReturnValue({ sub: mockUser.id, type: 'access' });

      await expect(service.refresh('access-token-as-refresh')).rejects.toThrow(UnauthorizedException);
    });

    it('throws UnauthorizedException if token not found in DB', async () => {
      jwtMock.verify.mockReturnValue({ sub: mockUser.id, type: 'refresh' });
      prismaMock.refreshToken.findUnique.mockResolvedValue(null);

      await expect(service.refresh('deleted-token')).rejects.toThrow(UnauthorizedException);
    });

    it('throws UnauthorizedException if token is expired', async () => {
      jwtMock.verify.mockReturnValue({ sub: mockUser.id, type: 'refresh' });
      prismaMock.refreshToken.findUnique.mockResolvedValue({
        ...mockRefreshToken,
        expiresAt: new Date(Date.now() - 1000), // past
      });

      await expect(service.refresh('expired-token')).rejects.toThrow(UnauthorizedException);
    });
  });

  // ── logout ──────────────────────────────────────────────────────────────────

  describe('logout', () => {
    it('deletes the refresh token from DB', async () => {
      prismaMock.refreshToken.deleteMany.mockResolvedValue({ count: 1 });

      await service.logout('some-refresh-token');

      expect(prismaMock.refreshToken.deleteMany).toHaveBeenCalledWith({
        where: { token: 'some-refresh-token' },
      });
    });

    it('does not throw if token already deleted (idempotent)', async () => {
      prismaMock.refreshToken.deleteMany.mockResolvedValue({ count: 0 });

      await expect(service.logout('already-gone-token')).resolves.not.toThrow();
    });
  });
});
