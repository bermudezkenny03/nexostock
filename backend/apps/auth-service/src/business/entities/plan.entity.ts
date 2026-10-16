import { ApiProperty } from '@nestjs/swagger';
import type { Plan } from '@prisma/client';
import { permissionsAllowedByPlan } from '../../common/rbac/permission.constants';

export class PlanEntity {
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
    type: [String],
    description: 'Permission codes this plan unlocks for its stores.',
  })
  permissions!: string[];
}

export function toPlanEntity(plan: Plan): PlanEntity {
  return {
    code: plan.code,
    name: plan.name,
    description: plan.description,
    maxUsers: plan.maxUsers,
    maxProducts: plan.maxProducts,
    permissions: [...permissionsAllowedByPlan(plan.code)],
  };
}
