import { Controller, Get } from '@nestjs/common';
import { ApiOkResponse, ApiProperty, ApiTags } from '@nestjs/swagger';
import { SkipThrottle } from '@nestjs/throttler';
import { AppService } from './app.service';
import { Public } from './common/decorators';

class HealthResponseEntity {
  @ApiProperty({ example: 'ok' })
  status!: string;
}

@ApiTags('health')
@Controller()
export class AppController {
  constructor(private readonly appService: AppService) {}

  @Get('health')
  @Public()
  @SkipThrottle()
  @ApiOkResponse({ type: HealthResponseEntity })
  health(): { status: string } {
    return this.appService.getHealth();
  }
}
