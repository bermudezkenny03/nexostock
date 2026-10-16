import { ApiProperty } from '@nestjs/swagger';

export class ModuleTreeNodeEntity {
  @ApiProperty({ format: 'uuid' })
  id!: string;

  @ApiProperty()
  code!: string;

  @ApiProperty()
  name!: string;

  @ApiProperty({ type: String, nullable: true })
  description!: string | null;

  @ApiProperty()
  sortOrder!: number;

  @ApiProperty({ type: String, nullable: true })
  route!: string | null;

  @ApiProperty({ type: String, nullable: true })
  icon!: string | null;

  @ApiProperty({ type: () => [ModuleTreeNodeEntity] })
  children!: ModuleTreeNodeEntity[];
}
