import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { BusinessStatusCache } from './business-status.cache';
import { ProxyService } from './proxy.service';

@Module({
  controllers: [AppController],
  providers: [ProxyService, BusinessStatusCache],
})
export class AppModule {}
