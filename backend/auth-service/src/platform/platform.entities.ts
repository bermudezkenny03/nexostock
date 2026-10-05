import { ApiProperty } from '@nestjs/swagger';
import { PlatformAction } from '@prisma/client';
import { PlanEntity } from '../business/entities';

export class PlatformOwnerEntity {
  @ApiProperty({ format: 'uuid' })
  id!: string;

  @ApiProperty()
  email!: string;

  @ApiProperty({ type: String, nullable: true })
  firstName!: string | null;

  @ApiProperty({ type: String, nullable: true })
  lastName!: string | null;

  @ApiProperty()
  isActive!: boolean;
}

export class PlatformBusinessEntity {
  @ApiProperty({ format: 'uuid' })
  id!: string;

  @ApiProperty()
  name!: string;

  @ApiProperty({ type: String, nullable: true })
  legalName!: string | null;

  @ApiProperty({ type: String, nullable: true })
  taxId!: string | null;

  @ApiProperty()
  isActive!: boolean;

  @ApiProperty({ type: PlanEntity })
  plan!: PlanEntity;

  @ApiProperty({ description: 'Active users, counted against plan.maxUsers.' })
  activeUsers!: number;

  @ApiProperty({ type: PlatformOwnerEntity, isArray: true })
  owners!: PlatformOwnerEntity[];

  @ApiProperty()
  createdAt!: Date;
}

export class PlatformAuditUserEntity {
  @ApiProperty({ format: 'uuid' })
  id!: string;

  @ApiProperty()
  email!: string;
}

export class PlatformAuditBusinessEntity {
  @ApiProperty({ format: 'uuid' })
  id!: string;

  @ApiProperty()
  name!: string;
}

export class PlatformAuditLogEntity {
  @ApiProperty({ format: 'uuid' })
  id!: string;

  @ApiProperty({ enum: PlatformAction, enumName: 'PlatformAction' })
  action!: PlatformAction;

  @ApiProperty({ type: PlatformAuditBusinessEntity })
  business!: PlatformAuditBusinessEntity;

  @ApiProperty({ type: PlatformAuditUserEntity })
  actor!: PlatformAuditUserEntity;

  @ApiProperty({ type: PlatformAuditUserEntity, nullable: true })
  targetUser!: PlatformAuditUserEntity | null;

  @ApiProperty({
    type: Object,
    nullable: true,
    example: { from: 'FREE', to: 'BASIC' },
  })
  details!: Record<string, unknown> | null;

  @ApiProperty()
  createdAt!: Date;
}

export class PlatformAuditLogPageEntity {
  @ApiProperty({ type: PlatformAuditLogEntity, isArray: true })
  items!: PlatformAuditLogEntity[];

  @ApiProperty()
  total!: number;

  @ApiProperty()
  page!: number;

  @ApiProperty()
  pageSize!: number;
}

export class PlatformBusinessPageEntity {
  @ApiProperty({ type: PlatformBusinessEntity, isArray: true })
  items!: PlatformBusinessEntity[];

  @ApiProperty()
  total!: number;

  @ApiProperty()
  page!: number;

  @ApiProperty()
  pageSize!: number;
}
