import { Controller, Get, Param, ParseUUIDPipe, UseGuards } from '@nestjs/common';
import { ApiExcludeController } from '@nestjs/swagger';
import { SkipThrottle } from '@nestjs/throttler';
import { Public } from '../common/decorators';
import { InternalKeyGuard } from './internal-key.guard';
import { InternalService, type BusinessStatus } from './internal.service';

@ApiExcludeController()
@Public()
@SkipThrottle()
@UseGuards(InternalKeyGuard)
@Controller('internal/businesses')
export class InternalController {
  constructor(private readonly internalService: InternalService) {}

  @Get(':id/status')
  status(@Param('id', ParseUUIDPipe) id: string): Promise<BusinessStatus> {
    return this.internalService.getBusinessStatus(id);
  }
}
