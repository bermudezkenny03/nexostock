import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import * as bcrypt from 'bcrypt';
import { bcryptRounds } from '../common/config/bcrypt.config';
import { PrismaService } from '../prisma/prisma.service';
import { CreateUserDto, UpdateUserDto } from './dto';
import { UserDetailEntity, UserListItemEntity } from './entities';
import { userAdminInclude, type UserWithRoles } from './interfaces';

@Injectable()
export class UsersService {
  constructor(private readonly prisma: PrismaService) {}

  async findAll(): Promise<UserListItemEntity[]> {
    const users = await this.prisma.user.findMany({
      include: userAdminInclude,
      orderBy: { email: 'asc' },
    });
    return users.map((user) => this.toListItem(user));
  }

  async findOne(id: string): Promise<UserDetailEntity> {
    const user = await this.prisma.user.findUnique({
      where: { id },
      include: userAdminInclude,
    });
    if (!user) {
      throw new NotFoundException('User not found');
    }
    return this.toDetail(user);
  }

  async create(dto: CreateUserDto): Promise<UserDetailEntity> {
    const email = dto.email.toLowerCase();
    const existing = await this.prisma.user.findUnique({ where: { email } });
    if (existing) {
      throw new ConflictException('Email already in use');
    }

    if (dto.roleIds?.length) {
      await this.assertRolesExist(dto.roleIds);
    }

    const passwordHash = await bcrypt.hash(dto.password, bcryptRounds());

    const user = await this.prisma.user.create({
      data: {
        email,
        passwordHash,
        detail: {
          create: {
            firstName: dto.firstName,
            lastName: dto.lastName,
          },
        },
        userRoles: dto.roleIds?.length
          ? {
              create: dto.roleIds.map((roleId) => ({ roleId })),
            }
          : undefined,
      },
      include: userAdminInclude,
    });

    return this.toDetail(user);
  }

  async update(id: string, dto: UpdateUserDto): Promise<UserDetailEntity> {
    const existing = await this.prisma.user.findUnique({
      where: { id },
      include: { detail: true },
    });
    if (!existing) {
      throw new NotFoundException('User not found');
    }

    if (dto.email) {
      const email = dto.email.toLowerCase();
      const conflict = await this.prisma.user.findFirst({
        where: { email, NOT: { id } },
      });
      if (conflict) {
        throw new ConflictException('Email already in use');
      }
    }

    if (dto.roleIds) {
      await this.assertRolesExist(dto.roleIds);
    }

    const passwordHash = dto.password
      ? await bcrypt.hash(dto.password, bcryptRounds())
      : undefined;

    await this.prisma.$transaction(async (tx) => {
      await tx.user.update({
        where: { id },
        data: {
          ...(dto.email !== undefined && { email: dto.email.toLowerCase() }),
          ...(dto.isActive !== undefined && { isActive: dto.isActive }),
          ...(passwordHash !== undefined && { passwordHash }),
        },
      });

      if (dto.firstName !== undefined || dto.lastName !== undefined) {
        if (existing.detail) {
          await tx.userDetail.update({
            where: { userId: id },
            data: {
              ...(dto.firstName !== undefined && { firstName: dto.firstName }),
              ...(dto.lastName !== undefined && { lastName: dto.lastName }),
            },
          });
        } else {
          await tx.userDetail.create({
            data: {
              userId: id,
              firstName: dto.firstName ?? '',
              lastName: dto.lastName ?? '',
            },
          });
        }
      }

      if (dto.roleIds !== undefined) {
        await tx.userRole.deleteMany({ where: { userId: id } });
        if (dto.roleIds.length > 0) {
          await tx.userRole.createMany({
            data: dto.roleIds.map((roleId) => ({ userId: id, roleId })),
          });
        }
      }
    });

    return this.findOne(id);
  }

  private async assertRolesExist(roleIds: string[]): Promise<void> {
    const count = await this.prisma.role.count({
      where: { id: { in: roleIds } },
    });
    if (count !== roleIds.length) {
      throw new NotFoundException('One or more roles not found');
    }
  }

  private toListItem(user: UserWithRoles): UserListItemEntity {
    return {
      id: user.id,
      email: user.email,
      isActive: user.isActive,
      firstName: user.detail?.firstName ?? null,
      lastName: user.detail?.lastName ?? null,
      roleIds: user.userRoles.map((ur) => ur.roleId),
      roleCodes: user.userRoles.map((ur) => ur.role.code),
    };
  }

  private toDetail(user: UserWithRoles): UserDetailEntity {
    return {
      id: user.id,
      email: user.email,
      isActive: user.isActive,
      firstName: user.detail?.firstName ?? null,
      lastName: user.detail?.lastName ?? null,
      phone: user.detail?.phone ?? null,
      roleIds: user.userRoles.map((ur) => ur.roleId),
      roleCodes: user.userRoles.map((ur) => ur.role.code),
      createdAt: user.createdAt,
      updatedAt: user.updatedAt,
    };
  }
}
