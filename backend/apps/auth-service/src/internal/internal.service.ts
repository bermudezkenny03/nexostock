import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

export interface BusinessStatus {
  id: string;
  isActive: boolean;
  planCode: string;
  planName: string;
  maxProducts: number | null;
}

@Injectable()
export class InternalService {
  constructor(private readonly prisma: PrismaService) {}

  async getBusinessStatus(businessId: string): Promise<BusinessStatus> {
    const business = await this.prisma.business.findUnique({
      where: { id: businessId },
      include: { plan: true },
    });
    if (!business) {
      throw new NotFoundException('Negocio no encontrado');
    }
    return {
      id: business.id,
      isActive: business.isActive,
      planCode: business.planCode,
      planName: business.plan.name,
      maxProducts: business.plan.maxProducts,
    };
  }
}
