import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Transform, Type } from 'class-transformer';
import {
  IsBoolean,
  IsInt,
  IsOptional,
  IsString,
  IsUUID,
  Matches,
  Max,
  MaxLength,
  Min,
  MinLength,
} from 'class-validator';
import { IsStrongPassword, Trim } from '../common/validation';

const PLAN_CODE = /^[A-Z0-9_]+$/;
const SEARCH_MAX_LENGTH = 120;
const REASON_MAX_LENGTH = 500;

export class PageQueryDto {
  @ApiPropertyOptional({ default: 1, minimum: 1 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page = 1;

  @ApiPropertyOptional({ default: 20, minimum: 1, maximum: 100 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  pageSize = 20;
}

export class ListAuditLogsQueryDto extends PageQueryDto {
  @ApiPropertyOptional({ format: 'uuid' })
  @IsOptional()
  @IsUUID('4', { message: 'businessId must be a UUID' })
  businessId?: string;
}

export class ListBusinessesQueryDto extends PageQueryDto {
  @ApiPropertyOptional({
    description: 'Matches name, legal name, tax id or an owner email.',
  })
  @IsOptional()
  @Trim()
  @IsString()
  @MaxLength(SEARCH_MAX_LENGTH)
  search?: string;

  @ApiPropertyOptional({ type: Boolean })
  @IsOptional()
  @Transform(({ value }: { value: unknown }) =>
    value === 'true' ? true : value === 'false' ? false : value,
  )
  @IsBoolean()
  isActive?: boolean;

  @ApiPropertyOptional({ example: 'FREE' })
  @IsOptional()
  @IsString()
  @Matches(PLAN_CODE)
  planCode?: string;
}

export class UpdateBusinessStatusDto {
  @ApiProperty()
  @IsBoolean()
  isActive!: boolean;

  @ApiPropertyOptional({
    description: 'Why the status changes. Stored in the audit log.',
  })
  @IsOptional()
  @Trim()
  @IsString()
  @MaxLength(REASON_MAX_LENGTH)
  reason?: string;
}

export class UpdatePlanDto {
  @ApiPropertyOptional({ example: 'Básico' })
  @IsOptional()
  @Trim()
  @IsString()
  @MinLength(1)
  @MaxLength(80)
  name?: string;

  @ApiPropertyOptional({ type: String, nullable: true })
  @IsOptional()
  @Trim()
  @IsString()
  @MaxLength(300)
  description?: string | null;

  @ApiPropertyOptional({
    type: Number,
    nullable: true,
    description: 'Null clears the limit.',
  })
  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(100_000)
  maxUsers?: number | null;

  @ApiPropertyOptional({
    type: Number,
    nullable: true,
    description: 'Null clears the limit.',
  })
  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(1_000_000)
  maxProducts?: number | null;

  @ApiPropertyOptional({
    type: String,
    nullable: true,
    example: '199.00',
    description: 'Monthly price. Null clears it. 0 means free.',
  })
  @IsOptional()
  @IsString()
  @Matches(/^(?:0|[1-9]\d{0,9})(?:\.\d{1,2})?$/)
  monthlyPrice?: string | null;
}

export class ChangeBusinessPlanDto {
  @ApiProperty({ example: 'BASIC' })
  @IsString()
  @Matches(PLAN_CODE)
  planCode!: string;
}

export class DecidePlanRequestDto {
  @ApiProperty({ description: 'True applies the requested plan. False rejects it.' })
  @IsBoolean()
  approve!: boolean;
}

export class ResetOwnerPasswordDto {
  @ApiProperty({
    minLength: 8,
    maxLength: 72,
    description:
      '8 to 72 characters, at least one letter and one number. The owner should change it after signing in.',
  })
  @IsStrongPassword()
  newPassword!: string;
}
