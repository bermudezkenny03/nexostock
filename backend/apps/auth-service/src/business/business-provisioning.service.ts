import { ConflictException, Injectable } from '@nestjs/common';
import * as bcrypt from 'bcrypt';
import { bcryptRounds } from '../common/config/bcrypt.config';
import { RoleCode } from '../common/rbac/permission.constants';
import { PrismaService } from '../prisma/prisma.service';
import { syncSystemRoles } from './system-roles';

export interface NewBusinessWithOwner {
  businessName: string;
  email: string;
  password: string;
  firstName: string;
  lastName: string;
}

export interface ProvisionedBusiness {
  businessId: string;
  ownerId: string;
}

@Injectable()
export class BusinessProvisioningService {
  constructor(private readonly prisma: PrismaService) {}

  async createWithOwner(
    input: NewBusinessWithOwner,
  ): Promise<ProvisionedBusiness> {
    const email = input.email.toLowerCase();
    const taken = await this.prisma.user.findUnique({
      where: { email },
      select: { id: true },
    });
    if (taken) {
      throw new ConflictException('El email ya está registrado');
    }

    const passwordHash = await bcrypt.hash(input.password, bcryptRounds());

    return this.prisma.$transaction(async (tx) => {
      const business = await tx.business.create({
        data: { name: input.businessName },
      });
      const roleIds = await syncSystemRoles(tx, business.id);

      const owner = await tx.user.create({
        data: {
          email,
          passwordHash,
          businessId: business.id,
          detail: {
            create: { firstName: input.firstName, lastName: input.lastName },
          },
        },
      });
      await tx.userRole.create({
        data: {
          userId: owner.id,
          roleId: roleIds[RoleCode.OWNER],
          businessId: business.id,
        },
      });

      return { businessId: business.id, ownerId: owner.id };
    });
  }
}
