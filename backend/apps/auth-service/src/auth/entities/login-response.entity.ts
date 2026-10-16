import { ApiProperty } from '@nestjs/swagger';
import type { ILoginResponse } from '../interfaces';
import { AuthUserEntity } from './auth-user.entity';

export class LoginResponseEntity implements ILoginResponse {
  @ApiProperty()
  accessToken!: string;

  @ApiProperty()
  refreshToken!: string;

  @ApiProperty({ type: () => AuthUserEntity })
  user!: AuthUserEntity;
}
