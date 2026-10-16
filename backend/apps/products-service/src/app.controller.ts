import { Controller, Get } from '@nestjs/common';
import { ApiOkResponse, ApiTags } from '@nestjs/swagger';
import { Public } from '@nexostock/common';
import { AppService } from './app.service';

@ApiTags('health')
@Controller()
export class AppController {
  constructor(private readonly appService: AppService) {}

  @Get('health')
  @Public()
  @ApiOkResponse({ description: 'Products service and database are reachable' })
  health(): Promise<{ status: string; service: string }> {
    return this.appService.getHealth();
  }
}
