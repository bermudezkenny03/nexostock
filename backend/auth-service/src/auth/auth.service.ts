import {
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcrypt';
import { createHash, randomBytes } from 'node:crypto';
import { AccessService } from '../common/access';
import type { AccessUserProfile, JwtPayload } from '../common/interfaces';
import { PrismaService } from '../prisma/prisma.service';
import { LogoutDto } from './dto/logout.dto';
import { LoginDto } from './dto/login.dto';
import { RefreshDto } from './dto/refresh.dto';
import {
  AuthUserEntity,
  LoginResponseEntity,
  RefreshResponseEntity,
} from './entities';
import type { IAuthUser, IStoredRefreshToken, ITokenPair } from './interfaces';

@Injectable()
export class AuthService {
  constructor(
    private readonly accessService: AccessService,
    private readonly jwtService: JwtService,
    private readonly prisma: PrismaService,
  ) {}

  async login(dto: LoginDto): Promise<LoginResponseEntity> {
    const candidate = await this.accessService.findActiveAuthCandidateByEmail(
      dto.email,
    );

    if (!candidate) {
      throw new UnauthorizedException('Invalid credentials');
    }

    const valid = await bcrypt.compare(dto.password, candidate.passwordHash);
    if (!valid) {
      throw new UnauthorizedException('Invalid credentials');
    }

    const authUser = this.mapAccessProfileToAuthUser(candidate.profile);
    const tokens = await this.issueTokenPair(authUser);

    return {
      ...tokens,
      user: authUser,
    };
  }

  async refresh(dto: RefreshDto): Promise<RefreshResponseEntity> {
    const stored = await this.findValidRefreshTokenRecord(dto.refreshToken);
    const profile = await this.accessService.findActiveAccessProfileById(
      stored.userId,
    );

    if (!profile) {
      throw new UnauthorizedException('Invalid or expired refresh token');
    }

    await this.revokeRefreshToken(stored.id);

    const authUser = this.mapAccessProfileToAuthUser(profile);

    return this.issueTokenPair(authUser);
  }

  async logout(dto: LogoutDto): Promise<void> {
    const tokenHash = this.hashRefreshToken(dto.refreshToken);
    await this.prisma.refreshToken.updateMany({
      where: {
        tokenHash,
        revokedAt: null,
      },
      data: { revokedAt: new Date() },
    });
  }

  async getProfile(userId: string): Promise<AuthUserEntity> {
    const profile =
      await this.accessService.findActiveAccessProfileById(userId);

    if (!profile) {
      throw new UnauthorizedException('User not found or inactive');
    }

    return this.mapAccessProfileToAuthUser(profile);
  }

  private async issueTokenPair(authUser: IAuthUser): Promise<ITokenPair> {
    const accessToken = await this.signAccessToken(authUser);
    const refreshToken = await this.createRefreshToken(authUser.id);

    return { accessToken, refreshToken };
  }

  private async findValidRefreshTokenRecord(
    refreshToken: string,
  ): Promise<IStoredRefreshToken> {
    const tokenHash = this.hashRefreshToken(refreshToken);
    const stored = await this.prisma.refreshToken.findFirst({
      where: {
        tokenHash,
        revokedAt: null,
        expiresAt: { gt: new Date() },
      },
      select: { id: true, userId: true },
    });

    if (!stored) {
      throw new UnauthorizedException('Invalid or expired refresh token');
    }

    return stored;
  }

  private async revokeRefreshToken(refreshTokenId: string): Promise<void> {
    await this.prisma.refreshToken.update({
      where: { id: refreshTokenId },
      data: { revokedAt: new Date() },
    });
  }

  private async signAccessToken(authUser: IAuthUser): Promise<string> {
    const payload: JwtPayload = {
      sub: authUser.id,
      email: authUser.email,
      businessId: authUser.businessId,
      roles: authUser.roles,
      permissions: authUser.permissions,
    };

    return this.jwtService.signAsync(payload);
  }

  private async createRefreshToken(userId: string): Promise<string> {
    const bytes = Number.parseInt(process.env.REFRESH_TOKEN_BYTES ?? '32', 10);
    const token = randomBytes(bytes).toString('base64url');
    const tokenHash = this.hashRefreshToken(token);
    const expiresAt = new Date(
      Date.now() + this.parseDurationMs(process.env.REFRESH_EXPIRES_IN ?? '7d'),
    );

    await this.prisma.refreshToken.create({
      data: {
        userId,
        tokenHash,
        expiresAt,
      },
    });

    return token;
  }

  private hashRefreshToken(token: string): string {
    return createHash('sha256').update(token).digest('hex');
  }

  private parseDurationMs(value: string): number {
    const match = /^(\d+)([smhd])$/.exec(value.trim());
    if (!match) {
      throw new Error(`Invalid duration: ${value}`);
    }

    const amount = Number.parseInt(match[1], 10);
    const unit = match[2];
    const multipliers: Record<string, number> = {
      s: 1000,
      m: 60_000,
      h: 3_600_000,
      d: 86_400_000,
    };

    return amount * multipliers[unit]!;
  }

  private mapAccessProfileToAuthUser(
    profile: AccessUserProfile,
  ): AuthUserEntity {
    return {
      id: profile.id,
      email: profile.email,
      businessId: profile.businessId,
      businessName: profile.businessName,
      firstName: profile.firstName,
      lastName: profile.lastName,
      roles: profile.roles,
      permissions: profile.permissions,
    };
  }
}
