import { ApiProperty } from '@nestjs/swagger';
import { RoleListItemEntity } from './role-list-item.entity';

export class RoleDetailEntity extends RoleListItemEntity {
  @ApiProperty({ type: [String], format: 'uuid' })
  permissionIds!: string[];

  @ApiProperty({ type: String, format: 'date-time' })
  createdAt!: Date;

  @ApiProperty({ type: String, format: 'date-time' })
  updatedAt!: Date;
}
