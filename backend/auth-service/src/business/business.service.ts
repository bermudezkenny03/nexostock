import { Injectable, NotFoundException } from '@nestjs/common';
import type { Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { UpdateBusinessDto } from './dto';
import { BusinessProfileEntity, toPlanEntity } from './entities';

function optionalText(
  value: string | null | undefined,
): string | null | undefined {
  return value === undefined ? undefined : value || null;
}

export const businessWithPlanInclude = {
  plan: true,
  _count: { select: { users: { where: { isActive: true } } } },
} as const satisfies Prisma.BusinessInclude;

export type BusinessWithPlan = Prisma.BusinessGetPayload<{
  include: typeof businessWithPlanInclude;
}>;

export function toBusinessProfile(
  business: BusinessWithPlan,
): BusinessProfileEntity {
  return {
    id: business.id,
    name: business.name,
    legalName: business.legalName,
    taxId: business.taxId,
    primaryColor: business.primaryColor,
    logoUrl: business.logoUrl,
    isActive: business.isActive,
    plan: toPlanEntity(business.plan),
    activeUsers: business._count.users,
  };
}

@Injectable()
export class BusinessService {
  constructor(private readonly prisma: PrismaService) {}

  async getProfile(businessId: string): Promise<BusinessProfileEntity> {
    const business = await this.prisma.business.findUnique({
      where: { id: businessId },
      include: businessWithPlanInclude,
    });
    if (!business) {
      throw new NotFoundException('Negocio no encontrado');
    }
    return toBusinessProfile(business);
  }

  async updateProfile(
    businessId: string,
    dto: UpdateBusinessDto,
  ): Promise<BusinessProfileEntity> {
    const business = await this.prisma.business.update({
      where: { id: businessId },
      data: {
        name: dto.name,
        legalName: optionalText(dto.legalName),
        taxId: optionalText(dto.taxId),
        primaryColor: optionalText(dto.primaryColor),
        logoUrl: optionalText(dto.logoUrl),
      },
      include: businessWithPlanInclude,
    });
    return toBusinessProfile(business);
  }
}
