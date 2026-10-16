import { ApiProperty } from '@nestjs/swagger';
import type { IRefreshResponse } from '../interfaces';

export class RefreshResponseEntity implements IRefreshResponse {
  @ApiProperty()
  accessToken!: string;

  @ApiProperty()
  refreshToken!: string;
}
