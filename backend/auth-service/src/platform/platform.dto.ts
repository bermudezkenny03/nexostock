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

export class ChangeBusinessPlanDto {
  @ApiProperty({ example: 'BASIC' })
  @IsString()
  @Matches(PLAN_CODE)
  planCode!: string;
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
