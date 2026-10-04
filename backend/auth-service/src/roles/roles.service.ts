import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import type { Role } from '@prisma/client';
import type { JwtPayload } from '../common/interfaces';
import {
  normalizeRoleCode,
  roleCodeFromName,
} from '../common/utils/code-from-name.util';
import { PrismaService } from '../prisma/prisma.service';
import { CreateRoleDto, UpdateRoleDto } from './dto';
import { RoleDetailEntity, RoleListItemEntity } from './entities';
import {
  roleWithPermissionsInclude,
  type RoleWithPermissions,
} from './interfaces';

@Injectable()
export class RolesService {
  constructor(private readonly prisma: PrismaService) {}

  async findAll(businessId: string): Promise<RoleListItemEntity[]> {
    const roles = await this.prisma.role.findMany({
      where: { businessId },
      include: roleWithPermissionsInclude,
      orderBy: [{ isSystem: 'desc' }, { name: 'asc' }],
    });
    return roles.map((role) => this.toListItem(role));
  }

  async findOne(id: string, businessId: string): Promise<RoleDetailEntity> {
    const role = await this.prisma.role.findFirst({
      where: { id, businessId },
      include: roleWithPermissionsInclude,
    });
    if (!role) {
      throw new NotFoundException('Rol no encontrado');
    }
    return this.toDetail(role);
  }

  async create(
    dto: CreateRoleDto,
    actor: JwtPayload,
  ): Promise<RoleDetailEntity> {
    const { businessId } = actor;
    const code = dto.code
      ? normalizeRoleCode(dto.code)
      : roleCodeFromName(dto.name);
    if (!code) {
      throw new BadRequestException('Código de rol inválido');
    }

    const existing = await this.prisma.role.findUnique({
      where: { businessId_code: { businessId, code } },
      select: { id: true },
    });
    if (existing) {
      throw new ConflictException('Ya existe un rol con ese código');
    }

    const permissionIds = dto.permissionIds ?? [];
    await this.assertGrantable(permissionIds, actor);

    const role = await this.prisma.role.create({
      data: {
        businessId,
        code,
        name: dto.name,
        description: dto.description || null,
        isSystem: false,
        rolePermissions: {
          create: permissionIds.map((permissionId) => ({ permissionId })),
        },
      },
      include: roleWithPermissionsInclude,
    });

    return this.toDetail(role);
  }

  async update(
    id: string,
    dto: UpdateRoleDto,
    actor: JwtPayload,
  ): Promise<RoleDetailEntity> {
    const { businessId } = actor;
    const role = await this.findEditableRole(id, businessId);

    if (dto.permissionIds !== undefined) {
      await this.assertGrantable(dto.permissionIds, actor);
    }

    await this.prisma.$transaction(async (tx) => {
      await tx.role.update({
        where: { id: role.id },
        data: {
          ...(dto.name !== undefined && { name: dto.name }),
          ...(dto.description !== undefined && {
            description: dto.description || null,
          }),
        },
      });

      if (dto.permissionIds !== undefined) {
        await tx.rolePermission.deleteMany({ where: { roleId: role.id } });
        await tx.rolePermission.createMany({
          data: dto.permissionIds.map((permissionId) => ({
            roleId: role.id,
            permissionId,
          })),
        });
      }
    });

    return this.findOne(id, businessId);
  }

  async remove(id: string, businessId: string): Promise<void> {
    const role = await this.findEditableRole(id, businessId);

    const assigned = await this.prisma.userRole.count({
      where: { roleId: role.id },
    });
    if (assigned > 0) {
      throw new ConflictException(
        `El rol está asignado a ${assigned} usuario(s); reasígnalos antes de eliminarlo`,
      );
    }

    await this.prisma.role.delete({ where: { id: role.id } });
  }

  private async findEditableRole(
    id: string,
    businessId: string,
  ): Promise<Role> {
    const role = await this.prisma.role.findFirst({
      where: { id, businessId },
    });
    if (!role) {
      throw new NotFoundException('Rol no encontrado');
    }
    if (role.isSystem) {
      throw new BadRequestException(
        'Los roles de sistema no se pueden modificar ni eliminar',
      );
    }
    return role;
  }

  private async assertGrantable(
    permissionIds: string[],
    actor: JwtPayload,
  ): Promise<void> {
    if (permissionIds.length === 0) {
      return;
    }

    const permissions = await this.prisma.permission.findMany({
      where: { id: { in: permissionIds } },
      select: { code: true },
    });
    if (permissions.length !== permissionIds.length) {
      throw new NotFoundException('Uno o más permisos no existen');
    }

    const held = new Set(actor.permissions);
    const missing = permissions
      .map((permission) => permission.code)
      .filter((code) => !held.has(code));
    if (missing.length > 0) {
      throw new ForbiddenException(
        `No puedes otorgar permisos que no tienes: ${missing.sort().join(', ')}`,
      );
    }
  }

  private toListItem(role: RoleWithPermissions): RoleListItemEntity {
    return {
      id: role.id,
      businessId: role.businessId,
      code: role.code,
      name: role.name,
      description: role.description,
      isSystem: role.isSystem,
      permissionCodes: role.rolePermissions
        .map((rp) => rp.permission.code)
        .sort(),
      userCount: role._count.userRoles,
    };
  }

  private toDetail(role: RoleWithPermissions): RoleDetailEntity {
    return {
      ...this.toListItem(role),
      permissionIds: role.rolePermissions.map((rp) => rp.permissionId),
      createdAt: role.createdAt,
      updatedAt: role.updatedAt,
    };
  }
}
