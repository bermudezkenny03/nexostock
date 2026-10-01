import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import {
  userWithAuthInclude,
  type UserWithAccess,
} from './user-with-access.interface';

export interface AccessUserProfile {
  id: string;
  email: string;
  firstName: string | null;
  lastName: string | null;
  roles: string[];
  permissions: string[];
}

@Injectable()
export class AccessService {
  constructor(private readonly prisma: PrismaService) {}

  async findUserWithAccessByEmail(email: string): Promise<UserWithAccess | null> {
    return this.prisma.user.findUnique({
      where: { email: email.toLowerCase() },
      include: userWithAuthInclude,
    });
  }

  async findUserWithAccessById(userId: string): Promise<UserWithAccess | null> {
    return this.prisma.user.findUnique({
      where: { id: userId },
      include: userWithAuthInclude,
    });
  }

  mapToAccessProfile(user: UserWithAccess): AccessUserProfile {
    const roles = user.userRoles.map((ur) => ur.role.code);
    const permissions = [
      ...new Set(
        user.userRoles.flatMap((ur) =>
          ur.role.rolePermissions.map((rp) => rp.permission.code),
        ),
      ),
    ].sort();

    return {
      id: user.id,
      email: user.email,
      firstName: user.detail?.firstName ?? null,
      lastName: user.detail?.lastName ?? null,
      roles,
      permissions,
    };
  }
}
