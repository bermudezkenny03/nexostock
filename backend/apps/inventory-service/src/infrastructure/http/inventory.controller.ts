import {
  Body,
  Controller,
  Get,
  Headers,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import {
  CurrentUser,
  InternalKeyGuard,
  Permission,
  RequirePermissions,
  type JwtPayload,
} from '@nexostock/common';
import { StockService } from '../../application/stock.service';
import {
  CreateMovementDto,
  EnsureStockDto,
  ListQueryDto,
  StockChangeDto,
  UpdateMinQuantityDto,
} from './dto/stock.dto';

@ApiTags('inventory')
@ApiBearerAuth()
@Controller('inventory')
export class InventoryController {
  constructor(private readonly stockService: StockService) {}

  @Get('stock')
  @RequirePermissions(Permission.INVENTORY_VIEW, Permission.PRODUCTS_VIEW, Permission.SALES_VIEW)
  list(@CurrentUser() actor: JwtPayload, @Query() query: ListQueryDto) {
    return this.stockService.list(actor.businessId, query);
  }

  @Get('stock/:productId')
  @RequirePermissions(Permission.INVENTORY_VIEW, Permission.PRODUCTS_VIEW, Permission.SALES_VIEW)
  findOne(
    @CurrentUser() actor: JwtPayload,
    @Param('productId', ParseUUIDPipe) productId: string,
  ) {
    return this.stockService.findOne(actor.businessId, productId);
  }

  @Patch('stock/:productId')
  @RequirePermissions(Permission.INVENTORY_MANAGE)
  updateMin(
    @CurrentUser() actor: JwtPayload,
    @Param('productId', ParseUUIDPipe) productId: string,
    @Body() dto: UpdateMinQuantityDto,
  ) {
    return this.stockService.updateMin(actor.businessId, productId, dto);
  }

  @Get('alerts')
  @RequirePermissions(Permission.INVENTORY_VIEW, Permission.PRODUCTS_VIEW, Permission.REPORTS_VIEW)
  alerts(@CurrentUser() actor: JwtPayload) {
    return this.stockService.alerts(actor.businessId);
  }

  @Get('movements')
  @RequirePermissions(Permission.INVENTORY_VIEW, Permission.PRODUCTS_VIEW)
  movements(@CurrentUser() actor: JwtPayload, @Query() query: ListQueryDto) {
    return this.stockService.movements(actor.businessId, query);
  }

  @Post('movements')
  @RequirePermissions(Permission.INVENTORY_MANAGE)
  move(
    @CurrentUser() actor: JwtPayload,
    @Body() dto: CreateMovementDto,
    @Headers('authorization') authorization: string,
    @Headers('idempotency-key') idempotencyKey?: string,
  ) {
    const token = authorization?.startsWith('Bearer ')
      ? authorization.slice('Bearer '.length)
      : '';
    return this.stockService.move(actor, dto, token, idempotencyKey);
  }
}

@ApiTags('internal-inventory')
@ApiBearerAuth()
@UseGuards(InternalKeyGuard)
@Controller('internal/stock')
export class InventoryInternalController {
  constructor(private readonly stockService: StockService) {}

  @Post('ensure')
  @RequirePermissions(Permission.PRODUCTS_MANAGE, Permission.INVENTORY_MANAGE)
  ensure(@CurrentUser() actor: JwtPayload, @Body() dto: EnsureStockDto) {
    return this.stockService.ensure(actor, dto);
  }

  @Post('deduct')
  @RequirePermissions(Permission.SALES_MANAGE, Permission.INVENTORY_MANAGE)
  deduct(
    @CurrentUser() actor: JwtPayload,
    @Body() dto: StockChangeDto,
    @Headers('idempotency-key') idempotencyKey?: string,
  ) {
    return this.stockService.deduct(actor, dto, idempotencyKey);
  }

  @Post('release')
  @RequirePermissions(Permission.SALES_MANAGE, Permission.INVENTORY_MANAGE)
  release(
    @CurrentUser() actor: JwtPayload,
    @Body() dto: StockChangeDto,
    @Headers('idempotency-key') idempotencyKey?: string,
  ) {
    return this.stockService.release(actor, dto, idempotencyKey);
  }

  @Get('alerts')
  @RequirePermissions(Permission.REPORTS_VIEW, Permission.INVENTORY_VIEW)
  alerts(@CurrentUser() actor: JwtPayload) {
    return this.stockService.alerts(actor.businessId);
  }

  @Get('summary')
  @RequirePermissions(Permission.REPORTS_VIEW, Permission.INVENTORY_VIEW)
  summary(@CurrentUser() actor: JwtPayload) {
    return this.stockService.summary(actor.businessId);
  }
}
