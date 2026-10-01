import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import type { AccessUserProfile } from './access-user-profile.interface';
import type { UserAuthCandidate } from './user-auth-candidate.interface';
import {
  userWithAuthInclude,
  type UserWithAccess,
} from './user-with-access.interface';

@Injectable()
export class AccessService {
  constructor(private readonly prisma: PrismaService) {}

  async findActiveAuthCandidateByEmail(
    email: string,
  ): Promise<UserAuthCandidate | null> {
    const user = await this.findUserWithAccessByEmail(email);
    if (!this.isActiveUserWithAccess(user)) {
      return null;
    }

    return {
      passwordHash: user.passwordHash,
      profile: this.mapToAccessProfile(user),
    };
  }

  async findActiveAccessProfileById(
    userId: string,
  ): Promise<AccessUserProfile | null> {
    const user = await this.findUserWithAccessById(userId);
    if (!this.isActiveUserWithAccess(user)) {
      return null;
    }

    return this.mapToAccessProfile(user);
  }

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
      businessId: user.businessId,
      businessName: user.business.name,
      firstName: user.detail?.firstName ?? null,
      lastName: user.detail?.lastName ?? null,
      roles,
      permissions,
    };
  }

  private isActiveUserWithAccess(
    user: UserWithAccess | null,
  ): user is UserWithAccess {
    return Boolean(user?.isActive && user.business.isActive);
  }
}
