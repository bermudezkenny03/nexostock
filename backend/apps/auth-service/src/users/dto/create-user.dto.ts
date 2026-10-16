import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsEmail,
  IsOptional,
  IsString,
  IsUUID,
  MaxLength,
} from 'class-validator';
import {
  EMAIL_MAX_LENGTH,
  IsName,
  IsStrongPassword,
  NormalizeEmail,
  Trim,
} from '../../common/validation';

export const PHONE_MAX_LENGTH = 30;

export class CreateUserDto {
  @ApiProperty({ example: 'user@example.com' })
  @NormalizeEmail()
  @IsEmail({}, { message: 'email must be a valid email address' })
  @MaxLength(EMAIL_MAX_LENGTH)
  email!: string;

  @ApiProperty({
    minLength: 8,
    maxLength: 72,
    example: 'SecurePass1!',
    description: '8 to 72 characters, at least one letter and one number.',
  })
  @IsStrongPassword()
  password!: string;

  @ApiProperty({ example: 'Jane' })
  @IsName()
  firstName!: string;

  @ApiProperty({ example: 'Doe' })
  @IsName()
  lastName!: string;

  @ApiPropertyOptional({
    type: String,
    nullable: true,
    example: '+57 300 000 0000',
  })
  @IsOptional()
  @Trim()
  @IsString()
  @MaxLength(PHONE_MAX_LENGTH)
  phone?: string | null;

  @ApiProperty({
    format: 'uuid',
    description:
      'Exactly one role of the caller business. Only an OWNER can assign OWNER.',
  })
  @IsUUID('4', { message: 'roleId must be a UUID' })
  roleId!: string;
}
