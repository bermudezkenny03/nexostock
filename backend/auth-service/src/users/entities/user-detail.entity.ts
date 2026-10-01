import { ApiProperty } from '@nestjs/swagger';
import { UserListItemEntity } from './user-list-item.entity';

export class UserDetailEntity extends UserListItemEntity {
  @ApiProperty({ type: String, nullable: true })
  phone!: string | null;

  @ApiProperty({ type: String, format: 'date-time' })
  createdAt!: Date;

  @ApiProperty({ type: String, format: 'date-time' })
  updatedAt!: Date;
}
