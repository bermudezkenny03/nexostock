import { ApiProperty } from '@nestjs/swagger';
import { IsEmail, MaxLength } from 'class-validator';
import {
  EMAIL_MAX_LENGTH,
  IsName,
  IsStrongPassword,
  NormalizeEmail,
} from '../../common/validation';

export class RegisterBusinessDto {
  @ApiProperty({ example: 'Papelería La Esquina' })
  @IsName()
  businessName!: string;

  @ApiProperty({ example: 'Ana' })
  @IsName()
  firstName!: string;

  @ApiProperty({ example: 'Pérez' })
  @IsName()
  lastName!: string;

  @ApiProperty({ example: 'ana@laesquina.com' })
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
}
