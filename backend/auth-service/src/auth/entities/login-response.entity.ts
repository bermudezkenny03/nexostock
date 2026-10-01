import { ApiProperty } from '@nestjs/swagger';
import { AuthUserEntity } from './auth-user.entity';

export class LoginResponseEntity {
  @ApiProperty()
  accessToken!: string;

  @ApiProperty()
  refreshToken!: string;

  @ApiProperty({ type: () => AuthUserEntity })
  user!: AuthUserEntity;
}
