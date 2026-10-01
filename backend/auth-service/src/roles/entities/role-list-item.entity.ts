import { ApiProperty } from '@nestjs/swagger';

export class RoleListItemEntity {
  @ApiProperty({ format: 'uuid' })
  id!: string;

  @ApiProperty({ format: 'uuid' })
  businessId!: string;

  @ApiProperty()
  code!: string;

  @ApiProperty()
  name!: string;

  @ApiProperty({ type: String, nullable: true })
  description!: string | null;

  @ApiProperty()
  isSystem!: boolean;

  @ApiProperty({ type: [String] })
  permissionCodes!: string[];

  @ApiProperty({
    description: 'Users holding this role. A role in use cannot be deleted.',
  })
  userCount!: number;
}
