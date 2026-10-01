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

const ROLE_CODE_PATTERN = /^[A-Z0-9_]+$/;

export class CreateRoleDto {
  @ApiProperty({ example: 'Warehouse manager' })
  @IsString()
  @MinLength(1)
  name!: string;

  @ApiPropertyOptional({
    example: 'WAREHOUSE_MANAGER',
    description:
      'Unique role code. If omitted, generated from name (e.g. WAREHOUSE_MANAGER).',
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

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  description?: string;

  @ApiPropertyOptional({ type: [String], format: 'uuid' })
  @IsOptional()
  @IsArray()
  @ArrayUnique()
  @IsUUID('4', { each: true })
  permissionIds?: string[];
}
