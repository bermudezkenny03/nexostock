import {
  Body,
  Controller,
  Get,
  Headers,
  Param,
  ParseUUIDPipe,
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
import { SalesService } from '../../application/sales.service';
import { CreateSaleDto, ListSalesQueryDto, RangeQueryDto } from './dto/sale.dto';

function bearer(authorization?: string): string {
  return authorization?.startsWith('Bearer ') ? authorization.slice('Bearer '.length) : '';
}

@ApiTags('sales')
@ApiBearerAuth()
@Controller('sales')
export class SalesController {
  constructor(private readonly salesService: SalesService) {}

  @Get()
  @RequirePermissions(Permission.SALES_VIEW, Permission.REPORTS_VIEW)
  list(@CurrentUser() actor: JwtPayload, @Query() query: ListSalesQueryDto) {
    return this.salesService.list(actor.businessId, query);
  }

  @Get(':id')
  @RequirePermissions(Permission.SALES_VIEW, Permission.REPORTS_VIEW)
  findOne(@Param('id', ParseUUIDPipe) id: string, @CurrentUser() actor: JwtPayload) {
    return this.salesService.findOne(id, actor.businessId);
  }

  @Post()
  @RequirePermissions(Permission.SALES_MANAGE)
  create(
    @CurrentUser() actor: JwtPayload,
    @Body() dto: CreateSaleDto,
    @Headers('authorization') authorization: string,
    @Headers('idempotency-key') idempotencyKey?: string,
  ) {
    return this.salesService.create(actor, dto, bearer(authorization), idempotencyKey);
  }

  @Post(':id/cancel')
  @RequirePermissions(Permission.SALES_MANAGE)
  cancel(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() actor: JwtPayload,
    @Headers('authorization') authorization: string,
  ) {
    return this.salesService.cancel(id, actor, bearer(authorization));
  }
}

@ApiTags('internal-sales')
@ApiBearerAuth()
@UseGuards(InternalKeyGuard)
@Controller('internal/sales')
export class SalesInternalController {
  constructor(private readonly salesService: SalesService) {}

  @Get('summary')
  @RequirePermissions(Permission.REPORTS_VIEW, Permission.SALES_VIEW)
  summary(@CurrentUser() actor: JwtPayload, @Query() query: RangeQueryDto) {
    return this.salesService.summary(actor.businessId, query.from, query.to);
  }

  @Get('series')
  @RequirePermissions(Permission.REPORTS_VIEW, Permission.SALES_VIEW)
  series(@CurrentUser() actor: JwtPayload, @Query() query: RangeQueryDto) {
    return this.salesService.series(actor.businessId, query.from, query.to);
  }

  @Get('top-products')
  @RequirePermissions(Permission.REPORTS_VIEW, Permission.SALES_VIEW)
  top(@CurrentUser() actor: JwtPayload, @Query() query: RangeQueryDto) {
    return this.salesService.topProducts(
      actor.businessId,
      query.from,
      query.to,
      query.limit,
    );
  }
}
