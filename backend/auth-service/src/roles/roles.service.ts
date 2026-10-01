import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { roleCodeFromName } from '../common/utils/code-from-name.util';
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

  async findAll(): Promise<RoleListItemEntity[]> {
    const roles = await this.prisma.role.findMany({
      include: roleWithPermissionsInclude,
      orderBy: { name: 'asc' },
    });
    return roles.map((role) => this.toListItem(role));
  }

  async findOne(id: string): Promise<RoleDetailEntity> {
    const role = await this.prisma.role.findUnique({
      where: { id },
      include: roleWithPermissionsInclude,
    });
    if (!role) {
      throw new NotFoundException('Role not found');
    }
    return this.toDetail(role);
  }

  async create(dto: CreateRoleDto): Promise<RoleDetailEntity> {
    const code = roleCodeFromName(dto.name);
    const existing = await this.prisma.role.findUnique({ where: { code } });
    if (existing) {
      throw new ConflictException('Role code already exists');
    }

    if (dto.permissionIds?.length) {
      await this.assertPermissionsExist(dto.permissionIds);
    }

    const role = await this.prisma.role.create({
      data: {
        code,
        name: dto.name,
        description: dto.description,
        isSystem: false,
        rolePermissions: dto.permissionIds?.length
          ? {
              create: dto.permissionIds.map((permissionId) => ({
                permissionId,
              })),
            }
          : undefined,
      },
      include: roleWithPermissionsInclude,
    });

    return this.toDetail(role);
  }

  async update(id: string, dto: UpdateRoleDto): Promise<RoleDetailEntity> {
    const role = await this.prisma.role.findUnique({ where: { id } });
    if (!role) {
      throw new NotFoundException('Role not found');
    }
    if (role.isSystem) {
      throw new BadRequestException('System roles cannot be modified');
    }

    if (dto.permissionIds) {
      await this.assertPermissionsExist(dto.permissionIds);
    }

    await this.prisma.$transaction(async (tx) => {
      await tx.role.update({
        where: { id },
        data: {
          ...(dto.name !== undefined && { name: dto.name }),
          ...(dto.description !== undefined && {
            description: dto.description,
          }),
        },
      });

      if (dto.permissionIds !== undefined) {
        await tx.rolePermission.deleteMany({ where: { roleId: id } });
        if (dto.permissionIds.length > 0) {
          await tx.rolePermission.createMany({
            data: dto.permissionIds.map((permissionId) => ({
              roleId: id,
              permissionId,
            })),
          });
        }
      }
    });

    return this.findOne(id);
  }

  async remove(id: string): Promise<void> {
    const role = await this.prisma.role.findUnique({ where: { id } });
    if (!role) {
      throw new NotFoundException('Role not found');
    }
    if (role.isSystem) {
      throw new BadRequestException('System roles cannot be deleted');
    }

    await this.prisma.role.delete({ where: { id } });
  }

  private async assertPermissionsExist(permissionIds: string[]): Promise<void> {
    const count = await this.prisma.permission.count({
      where: { id: { in: permissionIds } },
    });
    if (count !== permissionIds.length) {
      throw new NotFoundException('One or more permissions not found');
    }
  }

  private toListItem(role: RoleWithPermissions): RoleListItemEntity {
    return {
      id: role.id,
      code: role.code,
      name: role.name,
      description: role.description,
      isSystem: role.isSystem,
      permissionCodes: role.rolePermissions
        .map((rp) => rp.permission.code)
        .sort(),
    };
  }

  private toDetail(role: RoleWithPermissions): RoleDetailEntity {
    return {
      id: role.id,
      code: role.code,
      name: role.name,
      description: role.description,
      isSystem: role.isSystem,
      permissionIds: role.rolePermissions.map((rp) => rp.permissionId),
      permissionCodes: role.rolePermissions
        .map((rp) => rp.permission.code)
        .sort(),
      createdAt: role.createdAt,
      updatedAt: role.updatedAt,
    };
  }
}
