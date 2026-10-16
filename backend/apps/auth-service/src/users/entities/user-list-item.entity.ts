import { ApiProperty } from '@nestjs/swagger';

export class UserListItemEntity {
  @ApiProperty({ format: 'uuid' })
  id!: string;

  @ApiProperty()
  email!: string;

  @ApiProperty({ format: 'uuid' })
  businessId!: string;

  @ApiProperty()
  isActive!: boolean;

  @ApiProperty({ type: String, nullable: true })
  firstName!: string | null;

  @ApiProperty({ type: String, nullable: true })
  lastName!: string | null;

  @ApiProperty({ type: String, format: 'uuid', nullable: true })
  roleId!: string | null;

  @ApiProperty({ type: String, nullable: true })
  roleCode!: string | null;

  @ApiProperty({ type: String, nullable: true })
  roleName!: string | null;

  @ApiProperty({ type: String, format: 'date-time', nullable: true })
  lastLoginAt!: Date | null;
}
