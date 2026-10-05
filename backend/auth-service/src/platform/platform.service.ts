import {
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PlatformAction, type Prisma } from '@prisma/client';
import * as bcrypt from 'bcrypt';
import { TokenService } from '../auth/token.service';
import { type PlanEntity, toPlanEntity } from '../business/entities';
import { AccessService } from '../common/access';
import { bcryptRounds } from '../common/config/bcrypt.config';
import type { JwtPayload } from '../common/interfaces';
import {
  isPlatformBusiness,
  Permission,
  PLATFORM_BUSINESS_ID,
  RoleCode,
} from '../common/rbac/permission.constants';
import { PrismaService } from '../prisma/prisma.service';
import {
  ChangeBusinessPlanDto,
  ListAuditLogsQueryDto,
  ListBusinessesQueryDto,
  ResetOwnerPasswordDto,
  UpdateBusinessStatusDto,
} from './platform.dto';
import {
  PlatformAuditLogPageEntity,
  PlatformBusinessEntity,
  PlatformBusinessPageEntity,
} from './platform.entities';

const platformBusinessInclude = {
  plan: true,
  _count: { select: { users: { where: { isActive: true } } } },
  users: {
    where: { userRole: { role: { code: RoleCode.OWNER } } },
    select: {
      id: true,
      email: true,
      isActive: true,
      detail: { select: { firstName: true, lastName: true } },
    },
    orderBy: { createdAt: 'asc' },
  },
} as const satisfies Prisma.BusinessInclude;

type PlatformBusinessRow = Prisma.BusinessGetPayload<{
  include: typeof platformBusinessInclude;
}>;

const auditLogInclude = {
  actor: { select: { id: true, email: true } },
  business: { select: { id: true, name: true } },
  targetUser: { select: { id: true, email: true } },
} as const satisfies Prisma.PlatformAuditLogInclude;

const PROVIDER_ONLY = 'Solo el equipo de NexoStock puede usar esta ruta';

@Injectable()
export class PlatformService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly tokenService: TokenService,
    private readonly accessService: AccessService,
  ) {}

  async listPlans(): Promise<PlanEntity[]> {
    const plans = await this.prisma.plan.findMany({
      orderBy: { sortOrder: 'asc' },
    });
    return plans.map(toPlanEntity);
  }

  async listBusinesses(
    query: ListBusinessesQueryDto,
  ): Promise<PlatformBusinessPageEntity> {
    const { page, pageSize, search } = query;
    const where: Prisma.BusinessWhereInput = {
      id: { not: PLATFORM_BUSINESS_ID },
      ...(query.isActive !== undefined && { isActive: query.isActive }),
      ...(query.planCode && { planCode: query.planCode }),
      ...(search && {
        OR: [
          { name: { contains: search, mode: 'insensitive' } },
          { legalName: { contains: search, mode: 'insensitive' } },
          { taxId: { contains: search, mode: 'insensitive' } },
          {
            users: {
              some: {
                email: { contains: search.toLowerCase() },
                userRole: { role: { code: RoleCode.OWNER } },
              },
            },
          },
        ],
      }),
    };

    const [total, rows] = await this.prisma.$transaction([
      this.prisma.business.count({ where }),
      this.prisma.business.findMany({
        where,
        include: platformBusinessInclude,
        orderBy: [{ createdAt: 'desc' }, { id: 'asc' }],
        skip: (page - 1) * pageSize,
        take: pageSize,
      }),
    ]);

    return {
      items: rows.map((row) => this.toEntity(row)),
      total,
      page,
      pageSize,
    };
  }

  async getBusiness(businessId: string): Promise<PlatformBusinessEntity> {
    return this.toEntity(await this.findStore(businessId));
  }

  async setStatus(
    businessId: string,
    dto: UpdateBusinessStatusDto,
    actor: JwtPayload,
  ): Promise<PlatformBusinessEntity> {
    await this.assertActiveProvider(actor);
    const business = await this.findStore(businessId);
    if (business.isActive === dto.isActive) {
      return this.toEntity(business);
    }

    await this.prisma.$transaction(async (tx) => {
      await tx.business.update({
        where: { id: businessId },
        data: { isActive: dto.isActive },
      });
      if (!dto.isActive) {
        await tx.refreshToken.updateMany({
          where: { revokedAt: null, user: { businessId } },
          data: { revokedAt: new Date() },
        });
      }
      await tx.platformAuditLog.create({
        data: {
          actorUserId: actor.sub,
          businessId,
          action: dto.isActive
            ? PlatformAction.BUSINESS_ACTIVATED
            : PlatformAction.BUSINESS_DEACTIVATED,
          details: dto.reason ? { reason: dto.reason } : undefined,
        },
      });
    });

    return this.getBusiness(businessId);
  }

  async changePlan(
    businessId: string,
    dto: ChangeBusinessPlanDto,
    actor: JwtPayload,
  ): Promise<PlatformBusinessEntity> {
    await this.assertActiveProvider(actor);
    const business = await this.findStore(businessId);

    const plan = await this.prisma.plan.findUnique({
      where: { code: dto.planCode },
      select: { code: true },
    });
    if (!plan) {
      throw new NotFoundException('Plan no encontrado');
    }
    if (business.planCode === plan.code) {
      return this.toEntity(business);
    }

    await this.prisma.$transaction(async (tx) => {
      await tx.business.update({
        where: { id: businessId },
        data: { planCode: plan.code },
      });
      await tx.platformAuditLog.create({
        data: {
          actorUserId: actor.sub,
          businessId,
          action: PlatformAction.PLAN_CHANGED,
          details: { from: business.planCode, to: plan.code },
        },
      });
    });

    return this.getBusiness(businessId);
  }

  async resetOwnerPassword(
    businessId: string,
    userId: string,
    dto: ResetOwnerPasswordDto,
    actor: JwtPayload,
  ): Promise<void> {
    await this.assertActiveProvider(actor);
    await this.findStore(businessId);

    const owner = await this.prisma.user.findFirst({
      where: {
        id: userId,
        businessId,
        userRole: { role: { code: RoleCode.OWNER } },
      },
      select: { id: true },
    });
    if (!owner) {
      throw new NotFoundException('Propietario no encontrado en este negocio');
    }

    const passwordHash = await bcrypt.hash(dto.newPassword, bcryptRounds());
    await this.prisma.$transaction(async (tx) => {
      await tx.user.update({ where: { id: userId }, data: { passwordHash } });
      await this.tokenService.revokeAllForUser(userId, tx);
      await tx.platformAuditLog.create({
        data: {
          actorUserId: actor.sub,
          businessId,
          action: PlatformAction.OWNER_PASSWORD_RESET,
          targetUserId: userId,
        },
      });
    });
  }

  async listAuditLogs(
    query: ListAuditLogsQueryDto,
  ): Promise<PlatformAuditLogPageEntity> {
    const { page, pageSize } = query;
    const where: Prisma.PlatformAuditLogWhereInput = query.businessId
      ? { businessId: query.businessId }
      : {};

    const [total, rows] = await this.prisma.$transaction([
      this.prisma.platformAuditLog.count({ where }),
      this.prisma.platformAuditLog.findMany({
        where,
        include: auditLogInclude,
        orderBy: [{ createdAt: 'desc' }, { id: 'asc' }],
        skip: (page - 1) * pageSize,
        take: pageSize,
      }),
    ]);

    return {
      items: rows.map((row) => ({
        id: row.id,
        action: row.action,
        business: row.business,
        actor: row.actor,
        targetUser: row.targetUser,
        details: (row.details ?? null) as Record<string, unknown> | null,
        createdAt: row.createdAt,
      })),
      total,
      page,
      pageSize,
    };
  }

  private async findStore(businessId: string): Promise<PlatformBusinessRow> {
    const business = isPlatformBusiness(businessId)
      ? null
      : await this.prisma.business.findUnique({
          where: { id: businessId },
          include: platformBusinessInclude,
        });
    if (!business) {
      throw new NotFoundException('Negocio no encontrado');
    }
    return business;
  }

  private async assertActiveProvider(actor: JwtPayload): Promise<void> {
    const profile = await this.accessService.findActiveAccessProfileById(
      actor.sub,
    );
    const allowed =
      profile !== null &&
      isPlatformBusiness(profile.businessId) &&
      profile.permissions.includes(Permission.PLATFORM_MANAGE);
    if (!allowed) {
      throw new ForbiddenException(PROVIDER_ONLY);
    }
  }

  private toEntity(business: PlatformBusinessRow): PlatformBusinessEntity {
    return {
      id: business.id,
      name: business.name,
      legalName: business.legalName,
      taxId: business.taxId,
      isActive: business.isActive,
      plan: toPlanEntity(business.plan),
      activeUsers: business._count.users,
      owners: business.users.map((owner) => ({
        id: owner.id,
        email: owner.email,
        firstName: owner.detail?.firstName ?? null,
        lastName: owner.detail?.lastName ?? null,
        isActive: owner.isActive,
      })),
      createdAt: business.createdAt,
    };
  }
}
