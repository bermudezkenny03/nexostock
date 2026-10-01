import { ApiProperty } from '@nestjs/swagger';
import type { IAuthUser } from '../interfaces';

export class AuthUserEntity implements IAuthUser {
  @ApiProperty({ format: 'uuid' })
  id!: string;

  @ApiProperty()
  email!: string;

  @ApiProperty({ format: 'uuid' })
  businessId!: string;

  @ApiProperty()
  businessName!: string;

  @ApiProperty({ type: String, nullable: true, example: '#0F766E' })
  businessPrimaryColor!: string | null;

  @ApiProperty({ type: String, nullable: true })
  businessLogoUrl!: string | null;

  @ApiProperty({ nullable: true })
  firstName!: string | null;

  @ApiProperty({ nullable: true })
  lastName!: string | null;

  @ApiProperty({ type: [String] })
  roles!: string[];

  @ApiProperty({ type: [String] })
  permissions!: string[];
}
