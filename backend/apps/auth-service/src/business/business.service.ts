import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import type { Prisma } from '@prisma/client';
import { PLATFORM_BUSINESS_ID } from '../common/rbac/permission.constants';
import { PrismaService } from '../prisma/prisma.service';
import { UpdateBusinessDto } from './dto';
import {
  BusinessProfileEntity,
  type MyPlanRequestEntity,
  toPlanEntity,
} from './entities';

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

  async getPendingPlanRequest(
    businessId: string,
  ): Promise<MyPlanRequestEntity | null> {
    const request = await this.prisma.planChangeRequest.findFirst({
      where: { businessId, status: 'PENDING' },
      include: { requestedPlan: { select: { code: true, name: true } } },
    });
    if (!request) {
      return null;
    }
    return {
      id: request.id,
      requestedPlanCode: request.requestedPlan.code,
      requestedPlanName: request.requestedPlan.name,
      createdAt: request.createdAt,
    };
  }

  async requestPlanChange(
    businessId: string,
    planCode: string,
  ): Promise<MyPlanRequestEntity> {
    if (businessId === PLATFORM_BUSINESS_ID) {
      throw new BadRequestException(
        'El negocio de la plataforma no cambia de plan',
      );
    }
    const business = await this.prisma.business.findUnique({
      where: { id: businessId },
      select: { planCode: true },
    });
    if (!business) {
      throw new NotFoundException('Negocio no encontrado');
    }
    if (business.planCode === planCode) {
      throw new BadRequestException('El negocio ya está en ese plan');
    }
    const plan = await this.prisma.plan.findUnique({
      where: { code: planCode },
      select: { code: true, name: true },
    });
    if (!plan) {
      throw new BadRequestException('El plan no existe');
    }
    const pending = await this.getPendingPlanRequest(businessId);
    if (pending) {
      throw new ConflictException('Ya hay una solicitud de plan en revisión');
    }

    const created = await this.prisma.planChangeRequest.create({
      data: { businessId, requestedPlanCode: plan.code },
    });
    return {
      id: created.id,
      requestedPlanCode: plan.code,
      requestedPlanName: plan.name,
      createdAt: created.createdAt,
    };
  }
}
