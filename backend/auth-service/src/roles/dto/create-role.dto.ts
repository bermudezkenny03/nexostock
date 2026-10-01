import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import {
  ArrayUnique,
  IsArray,
  IsOptional,
  IsString,
  IsUUID,
  Matches,
  MaxLength,
  MinLength,
} from 'class-validator';
import { IsName, Trim } from '../../common/validation';

const ROLE_CODE_PATTERN = /^[A-Z0-9_]+$/;
export const ROLE_DESCRIPTION_MAX_LENGTH = 500;

export class CreateRoleDto {
  @ApiProperty({ example: 'Warehouse manager' })
  @IsName()
  name!: string;

  @ApiPropertyOptional({
    example: 'WAREHOUSE_MANAGER',
    description:
      'Unique role code within the business. If omitted, generated from name (e.g. WAREHOUSE_MANAGER).',
  })
  @IsOptional()
  @Transform(({ value }: { value: unknown }) =>
    typeof value === 'string' ? value.trim().toUpperCase() : value,
  )
  @IsString()
  @MinLength(2)
  @MaxLength(64)
  @Matches(ROLE_CODE_PATTERN, {
    message: 'code must contain only uppercase letters, numbers, and underscores',
  })
  code?: string;

  @ApiPropertyOptional({ type: String, nullable: true })
  @IsOptional()
  @Trim()
  @IsString()
  @MaxLength(ROLE_DESCRIPTION_MAX_LENGTH)
  description?: string | null;

  @ApiPropertyOptional({
    type: [String],
    format: 'uuid',
    description:
      'Permission ids from GET /api/permissions. You can only grant permissions you hold yourself.',
  })
  @IsOptional()
  @IsArray()
  @ArrayUnique()
  @IsUUID('4', { each: true })
  permissionIds?: string[];
}
