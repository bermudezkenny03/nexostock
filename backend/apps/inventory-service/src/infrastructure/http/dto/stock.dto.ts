import { Type } from 'class-transformer';
import {
  ArrayMaxSize,
  ArrayMinSize,
  IsArray,
  IsIn,
  IsInt,
  IsOptional,
  IsString,
  IsUUID,
  Max,
  MaxLength,
  Min,
  ValidateNested,
} from 'class-validator';

export class CreateMovementDto {
  @IsUUID()
  productId!: string;

  @IsIn(['IN', 'OUT', 'ADJUSTMENT'])
  type!: 'IN' | 'OUT' | 'ADJUSTMENT';

  @IsInt()
  @Min(0)
  @Max(1_000_000)
  quantity!: number;

  @IsOptional()
  @IsString()
  @MaxLength(300)
  reason?: string;
}

export class UpdateMinQuantityDto {
  @IsInt()
  @Min(0)
  @Max(1_000_000)
  minQuantity!: number;
}

export class ListQueryDto {
  @IsOptional()
  @IsUUID()
  productId?: string;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page?: number;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  pageSize?: number;
}

export class StockLineDto {
  @IsUUID()
  productId!: string;

  @IsInt()
  @Min(1)
  @Max(1_000_000)
  quantity!: number;
}

export class StockChangeDto {
  @IsIn(['SALE', 'SALE_CANCEL'])
  referenceType!: 'SALE' | 'SALE_CANCEL';

  @IsUUID()
  referenceId!: string;

  @IsArray()
  @ArrayMinSize(1)
  @ArrayMaxSize(100)
  @ValidateNested({ each: true })
  @Type(() => StockLineDto)
  lines!: StockLineDto[];
}

export class EnsureStockDto {
  @IsUUID()
  productId!: string;

  @IsOptional()
  @IsInt()
  @Min(0)
  @Max(1_000_000)
  minQuantity?: number;
}
