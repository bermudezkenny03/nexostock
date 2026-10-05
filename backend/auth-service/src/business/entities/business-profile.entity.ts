import { ApiProperty } from '@nestjs/swagger';
import { PlanEntity } from './plan.entity';

export class BusinessProfileEntity {
  @ApiProperty({ format: 'uuid' })
  id!: string;

  @ApiProperty()
  name!: string;

  @ApiProperty({ type: String, nullable: true })
  legalName!: string | null;

  @ApiProperty({ type: String, nullable: true })
  taxId!: string | null;

  @ApiProperty({ type: String, nullable: true, example: '#0F766E' })
  primaryColor!: string | null;

  @ApiProperty({ type: String, nullable: true })
  logoUrl!: string | null;

  @ApiProperty()
  isActive!: boolean;

  @ApiProperty({ type: PlanEntity })
  plan!: PlanEntity;

  @ApiProperty({ description: 'Active users, counted against plan.maxUsers.' })
  activeUsers!: number;
}
