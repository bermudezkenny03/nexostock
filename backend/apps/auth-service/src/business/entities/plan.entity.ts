import { ApiProperty } from '@nestjs/swagger';
import type { Plan } from '@prisma/client';
import { permissionsAllowedByPlan } from '../../common/rbac/permission.constants';

export class PublicPlanEntity {
  @ApiProperty({ example: 'FREE' })
  code!: string;

  @ApiProperty({ example: 'Gratis' })
  name!: string;

  @ApiProperty({ type: String, nullable: true })
  description!: string | null;

  @ApiProperty({
    type: Number,
    nullable: true,
    description: 'Maximum active users. Null means unlimited.',
  })
  maxUsers!: number | null;

  @ApiProperty({
    type: Number,
    nullable: true,
    description:
      'Maximum products, enforced by products-service. Null means unlimited.',
  })
  maxProducts!: number | null;

  @ApiProperty({
    type: String,
    nullable: true,
    example: '0',
    description:
      'Monthly price as a decimal string. Null means the platform has not published a price. 0 is free.',
  })
  monthlyPrice!: string | null;
}

export class PlanEntity extends PublicPlanEntity {
  @ApiProperty({
    type: [String],
    description: 'Permission codes this plan unlocks for its stores.',
  })
  permissions!: string[];
}

function monthlyPriceOf(plan: Plan): string | null {
  return plan.monthlyPrice === null ? null : plan.monthlyPrice.toString();
}

export function toPublicPlanEntity(plan: Plan): PublicPlanEntity {
  return {
    code: plan.code,
    name: plan.name,
    description: plan.description,
    maxUsers: plan.maxUsers,
    maxProducts: plan.maxProducts,
    monthlyPrice: monthlyPriceOf(plan),
  };
}

export function toPlanEntity(plan: Plan): PlanEntity {
  return {
    ...toPublicPlanEntity(plan),
    permissions: [...permissionsAllowedByPlan(plan.code)],
  };
}
