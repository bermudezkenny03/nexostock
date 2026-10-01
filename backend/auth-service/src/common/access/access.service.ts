import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import type { AccessUserProfile } from './access-user-profile.interface';
import {
  userWithAuthInclude,
  type UserWithAccess,
} from './user-with-access.interface';

@Injectable()
export class AccessService {
  constructor(private readonly prisma: PrismaService) {}

  findUserWithAccessByEmail(email: string): Promise<UserWithAccess | null> {
    return this.prisma.user.findUnique({
      where: { email: email.trim().toLowerCase() },
      include: userWithAuthInclude,
    });
  }

  findUserWithAccessById(userId: string): Promise<UserWithAccess | null> {
    return this.prisma.user.findUnique({
      where: { id: userId },
      include: userWithAuthInclude,
    });
  }

  async findActiveAccessProfileById(
    userId: string,
  ): Promise<AccessUserProfile | null> {
    const user = await this.findUserWithAccessById(userId);
    if (!user || !this.isActive(user)) {
      return null;
    }
    return this.mapToAccessProfile(user);
  }

  isActive(user: UserWithAccess): boolean {
    return user.isActive && user.business.isActive;
  }

  mapToAccessProfile(user: UserWithAccess): AccessUserProfile {
    const role = user.userRole?.role;
    const permissions = role
      ? role.rolePermissions.map((rp) => rp.permission.code).sort()
      : [];

    return {
      id: user.id,
      email: user.email,
      businessId: user.businessId,
      businessName: user.business.name,
      businessPrimaryColor: user.business.primaryColor,
      businessLogoUrl: user.business.logoUrl,
      firstName: user.detail?.firstName ?? null,
      lastName: user.detail?.lastName ?? null,
      roles: role ? [role.code] : [],
      permissions,
    };
  }
}
