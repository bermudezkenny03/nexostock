import { ApiProperty } from '@nestjs/swagger';

export class PermissionCatalogItemEntity {
  @ApiProperty({ format: 'uuid' })
  id!: string;

  @ApiProperty({ example: 'users.manage' })
  code!: string;

  @ApiProperty()
  name!: string;

  @ApiProperty({ example: 'manage' })
  action!: string;

  @ApiProperty({ format: 'uuid' })
  moduleId!: string;

  @ApiProperty({ example: 'admin-users' })
  moduleCode!: string;
}
