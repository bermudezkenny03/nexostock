import { ApiProperty } from '@nestjs/swagger';
import { IsString, MaxLength, MinLength } from 'class-validator';
import { IsStrongPassword, PASSWORD_MAX_LENGTH } from '../../common/validation';

export class ChangePasswordDto {
  @ApiProperty()
  @IsString()
  @MinLength(1)
  @MaxLength(PASSWORD_MAX_LENGTH)
  currentPassword!: string;

  @ApiProperty({
    minLength: 8,
    maxLength: 72,
    description: '8 to 72 characters, at least one letter and one number.',
  })
  @IsStrongPassword()
  newPassword!: string;
}
