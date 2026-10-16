import { Controller, Get, Headers, Query } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import {
  Permission,
  RequirePermissions,
} from '@nexostock/common';
import { RangeQueryDto } from './dto/range.dto';
import { ReportsService } from './reports.service';

function bearer(authorization?: string): string {
  return authorization?.startsWith('Bearer ') ? authorization.slice('Bearer '.length) : '';
}

@ApiTags('reports')
@ApiBearerAuth()
@RequirePermissions(Permission.REPORTS_VIEW)
@Controller('reports')
export class ReportsController {
  constructor(private readonly reportsService: ReportsService) {}

  @Get('overview')
  overview(@Headers('authorization') authorization: string, @Query() query: RangeQueryDto) {
    return this.reportsService.overview(bearer(authorization), query);
  }

  @Get('low-stock')
  lowStock(@Headers('authorization') authorization: string) {
    return this.reportsService.lowStock(bearer(authorization));
  }

  @Get('sales')
  sales(@Headers('authorization') authorization: string, @Query() query: RangeQueryDto) {
    return this.reportsService.sales(bearer(authorization), query);
  }

  @Get('top-products')
  topProducts(@Headers('authorization') authorization: string, @Query() query: RangeQueryDto) {
    return this.reportsService.topProducts(bearer(authorization), query);
  }
}
