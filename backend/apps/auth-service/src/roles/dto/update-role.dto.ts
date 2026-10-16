import { ApiPropertyOptional } from '@nestjs/swagger';
import {
  ArrayUnique,
  IsArray,
  IsOptional,
  IsString,
  IsUUID,
  MaxLength,
} from 'class-validator';
import { IsName, IsOptionalNonNull, Trim } from '../../common/validation';
import { ROLE_DESCRIPTION_MAX_LENGTH } from './create-role.dto';

export class UpdateRoleDto {
  @ApiPropertyOptional({ example: 'Warehouse manager' })
  @IsOptionalNonNull()
  @IsName()
  name?: string;

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
      'Replaces the permission set. You can only grant permissions you hold yourself.',
  })
  @IsOptionalNonNull()
  @IsArray()
  @ArrayUnique()
  @IsUUID('4', { each: true })
  permissionIds?: string[];
}
