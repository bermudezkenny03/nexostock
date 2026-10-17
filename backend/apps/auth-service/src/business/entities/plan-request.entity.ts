import { ApiProperty } from '@nestjs/swagger';

export class MyPlanRequestEntity {
  @ApiProperty({ format: 'uuid' })
  id!: string;

  @ApiProperty({ example: 'BASIC' })
  requestedPlanCode!: string;

  @ApiProperty({ example: 'Básico' })
  requestedPlanName!: string;

  @ApiProperty({ type: String, format: 'date-time' })
  createdAt!: Date;
}

export class PlatformPlanRequestEntity extends MyPlanRequestEntity {
  @ApiProperty({ format: 'uuid' })
  businessId!: string;

  @ApiProperty({ example: 'Papelería La Esquina' })
  businessName!: string;

  @ApiProperty({ example: 'FREE' })
  currentPlanCode!: string;

  @ApiProperty({ example: 'Gratis' })
  currentPlanName!: string;
}
