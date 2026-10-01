import { ApiProperty } from '@nestjs/swagger';

export class RefreshResponseEntity {
  @ApiProperty()
  accessToken!: string;

  @ApiProperty()
  refreshToken!: string;
}
