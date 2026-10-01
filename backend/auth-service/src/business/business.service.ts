import { Injectable, NotFoundException } from '@nestjs/common';
import type { Business } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { UpdateBusinessDto } from './dto';
import { BusinessProfileEntity } from './entities';

function optionalText(
  value: string | null | undefined,
): string | null | undefined {
  return value === undefined ? undefined : value || null;
}

@Injectable()
export class BusinessService {
  constructor(private readonly prisma: PrismaService) {}

  async getProfile(businessId: string): Promise<BusinessProfileEntity> {
    const business = await this.prisma.business.findUnique({
      where: { id: businessId },
    });
    if (!business) {
      throw new NotFoundException('Negocio no encontrado');
    }
    return this.toEntity(business);
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
    });
    return this.toEntity(business);
  }

  private toEntity(business: Business): BusinessProfileEntity {
    return {
      id: business.id,
      name: business.name,
      legalName: business.legalName,
      taxId: business.taxId,
      primaryColor: business.primaryColor,
      logoUrl: business.logoUrl,
      isActive: business.isActive,
    };
  }
}
