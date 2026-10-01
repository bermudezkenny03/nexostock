import { ApiProperty } from '@nestjs/swagger';
import { IsEmail, IsString, MaxLength, MinLength } from 'class-validator';
import {
  EMAIL_MAX_LENGTH,
  NormalizeEmail,
  PASSWORD_MAX_LENGTH,
} from '../../common/validation';

export class LoginDto {
  @ApiProperty({ example: 'admin@nexostock.local' })
  @NormalizeEmail()
  @IsEmail({}, { message: 'email must be a valid email address' })
  @MaxLength(EMAIL_MAX_LENGTH)
  email!: string;

  @ApiProperty({ example: 'Admin123!' })
  @IsString()
  @MinLength(1, { message: 'password must not be empty' })
  @MaxLength(PASSWORD_MAX_LENGTH)
  password!: string;
}
