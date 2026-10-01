import {
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcrypt';
import { createHash, randomBytes } from 'node:crypto';
import { AccessService } from '../common/access';
import type { JwtPayload } from '../common/interfaces';
import { PrismaService } from '../prisma/prisma.service';
import { LogoutDto } from './dto/logout.dto';
import { LoginDto } from './dto/login.dto';
import { RefreshDto } from './dto/refresh.dto';
import {
  AuthUserEntity,
  LoginResponseEntity,
  RefreshResponseEntity,
} from './entities';

@Injectable()
export class AuthService {
  constructor(
    private readonly accessService: AccessService,
    private readonly jwtService: JwtService,
    private readonly prisma: PrismaService,
  ) {}

  async login(dto: LoginDto): Promise<LoginResponseEntity> {
    const user = await this.accessService.findUserWithAccessByEmail(dto.email);

    if (!user?.isActive) {
      throw new UnauthorizedException('Invalid credentials');
    }

    const valid = await bcrypt.compare(dto.password, user.passwordHash);
    if (!valid) {
      throw new UnauthorizedException('Invalid credentials');
    }

    const authUser = this.toAuthUserEntity(
      this.accessService.mapToAccessProfile(user),
    );
    const accessToken = await this.signAccessToken(user.id, user.email, authUser);
    const refreshToken = await this.createRefreshToken(user.id);

    return {
      accessToken,
      refreshToken,
      user: authUser,
    };
  }

  async refresh(dto: RefreshDto): Promise<RefreshResponseEntity> {
    const tokenHash = this.hashRefreshToken(dto.refreshToken);
    const stored = await this.prisma.refreshToken.findFirst({
      where: {
        tokenHash,
        revokedAt: null,
        expiresAt: { gt: new Date() },
      },
    });

    if (!stored) {
      throw new UnauthorizedException('Invalid or expired refresh token');
    }

    const user = await this.accessService.findUserWithAccessById(stored.userId);

    if (!user?.isActive) {
      throw new UnauthorizedException('Invalid or expired refresh token');
    }

    await this.prisma.refreshToken.update({
      where: { id: stored.id },
      data: { revokedAt: new Date() },
    });

    const authUser = this.toAuthUserEntity(
      this.accessService.mapToAccessProfile(user),
    );
    const accessToken = await this.signAccessToken(user.id, user.email, authUser);
    const refreshToken = await this.createRefreshToken(user.id);

    return {
      accessToken,
      refreshToken,
    };
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
    const user = await this.accessService.findUserWithAccessById(userId);

    if (!user?.isActive) {
      throw new UnauthorizedException('User not found or inactive');
    }

    return this.toAuthUserEntity(this.accessService.mapToAccessProfile(user));
  }

  private async signAccessToken(
    userId: string,
    email: string,
    authUser: AuthUserEntity,
  ): Promise<string> {
    const payload: JwtPayload = {
      sub: userId,
      email,
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

  private toAuthUserEntity(profile: {
    id: string;
    email: string;
    firstName: string | null;
    lastName: string | null;
    roles: string[];
    permissions: string[];
  }): AuthUserEntity {
    return {
      id: profile.id,
      email: profile.email,
      firstName: profile.firstName,
      lastName: profile.lastName,
      roles: profile.roles,
      permissions: profile.permissions,
    };
  }
}
