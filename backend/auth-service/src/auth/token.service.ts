import { Injectable, Logger, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import type { Prisma } from '@prisma/client';
import { createHash, randomBytes } from 'node:crypto';
import {
  refreshTokenBytes,
  refreshTokenTtlMs,
} from '../common/config/auth.config';
import type { JwtPayload } from '../common/interfaces';
import { PrismaService } from '../prisma/prisma.service';
import type { IAuthUser, ITokenPair } from './interfaces';

const INVALID_REFRESH_TOKEN = 'Sesión inválida o expirada';

@Injectable()
export class TokenService {
  private readonly logger = new Logger(TokenService.name);
  private readonly refreshTtlMs = refreshTokenTtlMs();
  private readonly refreshBytes = refreshTokenBytes();

  constructor(
    private readonly jwtService: JwtService,
    private readonly prisma: PrismaService,
  ) {}

  async issueTokenPair(user: IAuthUser): Promise<ITokenPair> {
    const payload: JwtPayload = {
      sub: user.id,
      email: user.email,
      businessId: user.businessId,
      roles: user.roles,
      permissions: user.permissions,
    };

    const [accessToken, refreshToken] = await Promise.all([
      this.jwtService.signAsync(payload),
      this.createRefreshToken(user.id),
    ]);

    return { accessToken, refreshToken };
  }

  async consumeRefreshToken(rawToken: string): Promise<string> {
    const stored = await this.prisma.refreshToken.findUnique({
      where: { tokenHash: this.hash(rawToken) },
      select: { id: true, userId: true, revokedAt: true, expiresAt: true },
    });

    if (!stored) {
      throw new UnauthorizedException(INVALID_REFRESH_TOKEN);
    }

    if (stored.revokedAt) {
      await this.handleReuse(stored.userId);
      throw new UnauthorizedException(INVALID_REFRESH_TOKEN);
    }

    if (stored.expiresAt <= new Date()) {
      throw new UnauthorizedException(INVALID_REFRESH_TOKEN);
    }

    const { count } = await this.prisma.refreshToken.updateMany({
      where: { id: stored.id, revokedAt: null },
      data: { revokedAt: new Date() },
    });
    if (count === 0) {
      await this.handleReuse(stored.userId);
      throw new UnauthorizedException(INVALID_REFRESH_TOKEN);
    }

    return stored.userId;
  }

  async revokeRefreshToken(rawToken: string): Promise<void> {
    await this.prisma.refreshToken.updateMany({
      where: { tokenHash: this.hash(rawToken), revokedAt: null },
      data: { revokedAt: new Date() },
    });
  }

  async revokeAllForUser(
    userId: string,
    db: Prisma.TransactionClient = this.prisma,
  ): Promise<void> {
    await db.refreshToken.updateMany({
      where: { userId, revokedAt: null },
      data: { revokedAt: new Date() },
    });
  }

  private async createRefreshToken(userId: string): Promise<string> {
    const token = randomBytes(this.refreshBytes).toString('base64url');
    const now = Date.now();

    await this.prisma.$transaction([
      this.prisma.refreshToken.deleteMany({
        where: { userId, expiresAt: { lt: new Date(now) } },
      }),
      this.prisma.refreshToken.create({
        data: {
          userId,
          tokenHash: this.hash(token),
          expiresAt: new Date(now + this.refreshTtlMs),
        },
      }),
    ]);

    return token;
  }

  private async handleReuse(userId: string): Promise<void> {
    this.logger.warn(
      `Refresh token reuse detected for user ${userId}; revoking all sessions`,
    );
    await this.revokeAllForUser(userId);
  }

  private hash(token: string): string {
    return createHash('sha256').update(token).digest('hex');
  }
}
