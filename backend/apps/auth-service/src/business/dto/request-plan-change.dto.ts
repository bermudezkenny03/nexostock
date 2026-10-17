import { ApiProperty } from '@nestjs/swagger';
import { IsString, Matches, MaxLength } from 'class-validator';

export class RequestPlanChangeDto {
  @ApiProperty({ example: 'BASIC' })
  @IsString()
  @Matches(/^[A-Z0-9_]+$/)
  @MaxLength(32)
  planCode!: string;
}
