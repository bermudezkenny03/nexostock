import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import * as bcrypt from 'bcrypt';
import { BusinessProvisioningService } from '../business/business-provisioning.service';
import { AccessService } from '../common/access';
import { registrationEnabled } from '../common/config/auth.config';
import { bcryptRounds } from '../common/config/bcrypt.config';
import { PrismaService } from '../prisma/prisma.service';
import {
  ChangePasswordDto,
  LoginDto,
  LogoutDto,
  RefreshDto,
  RegisterBusinessDto,
} from './dto';
import {
  AuthUserEntity,
  LoginResponseEntity,
  RefreshResponseEntity,
} from './entities';
import { TokenService } from './token.service';

const INVALID_CREDENTIALS = 'Credenciales inválidas';

@Injectable()
export class AuthService {
  private readonly dummyPasswordHash = bcrypt.hashSync(
    'nexostock-timing-equalizer',
    bcryptRounds(),
  );

  constructor(
    private readonly accessService: AccessService,
    private readonly provisioning: BusinessProvisioningService,
    private readonly tokenService: TokenService,
    private readonly prisma: PrismaService,
  ) {}

  async login(dto: LoginDto): Promise<LoginResponseEntity> {
    const user = await this.accessService.findUserWithAccessByEmail(dto.email);
    const valid = await bcrypt.compare(
      dto.password,
      user?.passwordHash ?? this.dummyPasswordHash,
    );
    if (!user || !valid) {
      throw new UnauthorizedException(INVALID_CREDENTIALS);
    }

    if (!user.isActive) {
      throw new ForbiddenException('El usuario está inactivo');
    }
    if (!user.business.isActive) {
      throw new ForbiddenException('El negocio está inactivo');
    }

    await this.prisma.user.update({
      where: { id: user.id },
      data: { lastLoginAt: new Date() },
    });

    const authUser = this.accessService.mapToAccessProfile(user);
    return {
      ...(await this.tokenService.issueTokenPair(authUser)),
      user: authUser,
    };
  }

  async register(dto: RegisterBusinessDto): Promise<LoginResponseEntity> {
    if (!registrationEnabled()) {
      throw new ForbiddenException(
        'El registro de negocios está deshabilitado',
      );
    }

    const { ownerId } = await this.provisioning.createWithOwner(dto);
    const authUser = await this.requireActiveProfile(ownerId);
    return {
      ...(await this.tokenService.issueTokenPair(authUser)),
      user: authUser,
    };
  }

  async refresh(dto: RefreshDto): Promise<RefreshResponseEntity> {
    const userId = await this.tokenService.consumeRefreshToken(
      dto.refreshToken,
    );
    const authUser = await this.requireActiveProfile(userId);
    return this.tokenService.issueTokenPair(authUser);
  }

  logout(dto: LogoutDto): Promise<void> {
    return this.tokenService.revokeRefreshToken(dto.refreshToken);
  }

  logoutAll(userId: string): Promise<void> {
    return this.tokenService.revokeAllForUser(userId);
  }

  async changePassword(userId: string, dto: ChangePasswordDto): Promise<void> {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { passwordHash: true },
    });
    if (!user) {
      throw new UnauthorizedException('Sesión inválida o expirada');
    }

    const valid = await bcrypt.compare(dto.currentPassword, user.passwordHash);
    if (!valid) {
      throw new BadRequestException('La contraseña actual no es correcta');
    }
    if (dto.currentPassword === dto.newPassword) {
      throw new BadRequestException(
        'La nueva contraseña debe ser distinta de la actual',
      );
    }

    const passwordHash = await bcrypt.hash(dto.newPassword, bcryptRounds());
    await this.prisma.$transaction(async (tx) => {
      await tx.user.update({ where: { id: userId }, data: { passwordHash } });
      await this.tokenService.revokeAllForUser(userId, tx);
    });
  }

  getProfile(userId: string): Promise<AuthUserEntity> {
    return this.requireActiveProfile(userId);
  }

  private async requireActiveProfile(userId: string): Promise<AuthUserEntity> {
    const profile =
      await this.accessService.findActiveAccessProfileById(userId);
    if (!profile) {
      throw new UnauthorizedException('Usuario o negocio inactivo');
    }
    return profile;
  }
}
