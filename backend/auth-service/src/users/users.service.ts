import {
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import type { Prisma, Role } from '@prisma/client';
import * as bcrypt from 'bcrypt';
import { TokenService } from '../auth/token.service';
import { bcryptRounds } from '../common/config/bcrypt.config';
import type { JwtPayload } from '../common/interfaces';
import {
  isPrivilegedRole,
  PRIVILEGED_ROLE_CODES,
} from '../common/rbac/permission.constants';
import { PrismaService } from '../prisma/prisma.service';
import { CreateUserDto, UpdateUserDto } from './dto';
import { UserDetailEntity, UserListItemEntity } from './entities';
import { userAdminInclude, type UserWithRoles } from './interfaces';

@Injectable()
export class UsersService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly tokenService: TokenService,
  ) {}

  async findAll(businessId: string): Promise<UserListItemEntity[]> {
    const users = await this.prisma.user.findMany({
      where: { businessId },
      include: userAdminInclude,
      orderBy: { email: 'asc' },
    });
    return users.map((user) => this.toListItem(user));
  }

  async findOne(id: string, businessId: string): Promise<UserDetailEntity> {
    const user = await this.prisma.user.findFirst({
      where: { id, businessId },
      include: userAdminInclude,
    });
    if (!user) {
      throw new NotFoundException('Usuario no encontrado');
    }
    return this.toDetail(user);
  }

  async create(
    dto: CreateUserDto,
    actor: JwtPayload,
  ): Promise<UserDetailEntity> {
    const { businessId } = actor;
    const role = await this.findRoleInBusiness(dto.roleId, businessId);
    this.assertCanAssignRole(role, actor);
    await this.assertEmailAvailable(dto.email);

    const passwordHash = await bcrypt.hash(dto.password, bcryptRounds());

    const userId = await this.prisma.$transaction(async (tx) => {
      const created = await tx.user.create({
        data: {
          email: dto.email,
          passwordHash,
          businessId,
          detail: {
            create: {
              firstName: dto.firstName,
              lastName: dto.lastName,
              phone: dto.phone || null,
            },
          },
        },
      });
      await tx.userRole.create({
        data: { userId: created.id, roleId: role.id, businessId },
      });
      return created.id;
    });

    return this.findOne(userId, businessId);
  }

  async update(
    id: string,
    dto: UpdateUserDto,
    actor: JwtPayload,
  ): Promise<UserDetailEntity> {
    const { businessId } = actor;
    const existing = await this.prisma.user.findFirst({
      where: { id, businessId },
      include: userAdminInclude,
    });
    if (!existing) {
      throw new NotFoundException('Usuario no encontrado');
    }

    const currentRole = existing.userRole?.role ?? null;
    const nextRole =
      dto.roleId !== undefined && dto.roleId !== currentRole?.id
        ? await this.findRoleInBusiness(dto.roleId, businessId)
        : null;
    const deactivating = dto.isActive === false && existing.isActive;
    const emailChanged =
      dto.email !== undefined && dto.email !== existing.email;

    this.assertSelfEditAllowed(id, actor, dto, nextRole, deactivating);
    if (isPrivilegedRole(currentRole?.code) && !this.isOwner(actor)) {
      throw new ForbiddenException(
        'Solo un propietario puede modificar a otro propietario',
      );
    }
    if (nextRole) {
      this.assertCanAssignRole(nextRole, actor);
    }
    if (emailChanged) {
      await this.assertEmailAvailable(dto.email!, id);
    }

    const passwordHash = dto.password
      ? await bcrypt.hash(dto.password, bcryptRounds())
      : undefined;

    await this.prisma.$transaction(async (tx) => {
      await this.lockBusiness(tx, businessId);

      const losesOwnership =
        existing.isActive &&
        isPrivilegedRole(currentRole?.code) &&
        (deactivating ||
          (nextRole !== null && !isPrivilegedRole(nextRole.code)));
      if (losesOwnership) {
        await this.assertAnotherActiveOwner(tx, businessId, id);
      }

      await tx.user.update({
        where: { id },
        data: {
          ...(emailChanged && { email: dto.email }),
          ...(dto.isActive !== undefined && { isActive: dto.isActive }),
          ...(passwordHash !== undefined && { passwordHash }),
        },
      });

      await this.updateDetail(tx, existing, dto);

      if (nextRole) {
        await tx.userRole.upsert({
          where: { userId: id },
          update: { roleId: nextRole.id },
          create: { userId: id, roleId: nextRole.id, businessId },
        });
      }

      if (nextRole || passwordHash || deactivating || emailChanged) {
        await this.tokenService.revokeAllForUser(id, tx);
      }
    });

    return this.findOne(id, businessId);
  }

  private async updateDetail(
    tx: Prisma.TransactionClient,
    existing: UserWithRoles,
    dto: UpdateUserDto,
  ): Promise<void> {
    if (
      dto.firstName === undefined &&
      dto.lastName === undefined &&
      dto.phone === undefined
    ) {
      return;
    }

    const phone = dto.phone === undefined ? undefined : dto.phone || null;
    await tx.userDetail.upsert({
      where: { userId: existing.id },
      update: {
        ...(dto.firstName !== undefined && { firstName: dto.firstName }),
        ...(dto.lastName !== undefined && { lastName: dto.lastName }),
        ...(phone !== undefined && { phone }),
      },
      create: {
        userId: existing.id,
        firstName: dto.firstName ?? '',
        lastName: dto.lastName ?? '',
        phone: phone ?? null,
      },
    });
  }

  private assertSelfEditAllowed(
    id: string,
    actor: JwtPayload,
    dto: UpdateUserDto,
    nextRole: Role | null,
    deactivating: boolean,
  ): void {
    if (id !== actor.sub) {
      return;
    }
    if (deactivating) {
      throw new ForbiddenException('No puedes desactivar tu propia cuenta');
    }
    if (nextRole) {
      throw new ForbiddenException('No puedes cambiar tu propio rol');
    }
    if (dto.password !== undefined) {
      throw new ForbiddenException(
        'Para cambiar tu contraseña usa POST /auth/change-password',
      );
    }
  }

  private assertCanAssignRole(role: Role, actor: JwtPayload): void {
    if (isPrivilegedRole(role.code) && !this.isOwner(actor)) {
      throw new ForbiddenException(
        'Solo un propietario puede asignar el rol de propietario',
      );
    }
  }

  private isOwner(actor: JwtPayload): boolean {
    return actor.roles.some((code) => isPrivilegedRole(code));
  }

  private async findRoleInBusiness(
    roleId: string,
    businessId: string,
  ): Promise<Role> {
    const role = await this.prisma.role.findFirst({
      where: { id: roleId, businessId },
    });
    if (!role) {
      throw new NotFoundException('Rol no encontrado');
    }
    return role;
  }

  private async assertEmailAvailable(
    email: string,
    exceptUserId?: string,
  ): Promise<void> {
    const taken = await this.prisma.user.findFirst({
      where: { email, ...(exceptUserId && { NOT: { id: exceptUserId } }) },
      select: { id: true },
    });
    if (taken) {
      throw new ConflictException('El email ya está registrado');
    }
  }

  private async lockBusiness(
    tx: Prisma.TransactionClient,
    businessId: string,
  ): Promise<void> {
    await tx.$queryRaw`SELECT id FROM businesses WHERE id = ${businessId}::uuid FOR UPDATE`;
  }

  private async assertAnotherActiveOwner(
    tx: Prisma.TransactionClient,
    businessId: string,
    userId: string,
  ): Promise<void> {
    const others = await tx.user.count({
      where: {
        businessId,
        isActive: true,
        id: { not: userId },
        userRole: { role: { code: { in: [...PRIVILEGED_ROLE_CODES] } } },
      },
    });
    if (others === 0) {
      throw new ConflictException(
        'El negocio no puede quedarse sin un propietario activo',
      );
    }
  }

  private toListItem(user: UserWithRoles): UserListItemEntity {
    const role = user.userRole?.role ?? null;
    return {
      id: user.id,
      email: user.email,
      businessId: user.businessId,
      isActive: user.isActive,
      firstName: user.detail?.firstName ?? null,
      lastName: user.detail?.lastName ?? null,
      roleId: role?.id ?? null,
      roleCode: role?.code ?? null,
      roleName: role?.name ?? null,
      lastLoginAt: user.lastLoginAt,
    };
  }

  private toDetail(user: UserWithRoles): UserDetailEntity {
    return {
      ...this.toListItem(user),
      phone: user.detail?.phone ?? null,
      createdAt: user.createdAt,
      updatedAt: user.updatedAt,
    };
  }
}
