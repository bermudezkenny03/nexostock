import { ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsBoolean,
  IsEmail,
  IsOptional,
  IsString,
  IsUUID,
  MaxLength,
} from 'class-validator';
import {
  EMAIL_MAX_LENGTH,
  IsName,
  IsOptionalNonNull,
  IsStrongPassword,
  NormalizeEmail,
  Trim,
} from '../../common/validation';
import { PHONE_MAX_LENGTH } from './create-user.dto';

export class UpdateUserDto {
  @ApiPropertyOptional({ example: 'user@example.com' })
  @IsOptionalNonNull()
  @NormalizeEmail()
  @IsEmail({}, { message: 'email must be a valid email address' })
  @MaxLength(EMAIL_MAX_LENGTH)
  email?: string;

  @ApiPropertyOptional({
    minLength: 8,
    maxLength: 72,
    description:
      'Resets the password of another user. To change your own, use POST /auth/change-password.',
  })
  @IsOptionalNonNull()
  @IsStrongPassword()
  password?: string;

  @ApiPropertyOptional({ example: 'Jane' })
  @IsOptionalNonNull()
  @IsName()
  firstName?: string;

  @ApiPropertyOptional({ example: 'Doe' })
  @IsOptionalNonNull()
  @IsName()
  lastName?: string;

  @ApiPropertyOptional({ type: String, nullable: true })
  @IsOptional()
  @Trim()
  @IsString()
  @MaxLength(PHONE_MAX_LENGTH)
  phone?: string | null;

  @ApiPropertyOptional()
  @IsOptionalNonNull()
  @IsBoolean()
  isActive?: boolean;

  @ApiPropertyOptional({
    format: 'uuid',
    description:
      'Replaces the user role. The role must belong to the caller business.',
  })
  @IsOptionalNonNull()
  @IsUUID('4', { message: 'roleId must be a UUID' })
  roleId?: string;
}
