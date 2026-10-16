import { Module } from '@nestjs/common';
import { ReportsClients } from './clients';
import { ReportsController } from './reports.controller';
import { ReportsService } from './reports.service';

@Module({
  controllers: [ReportsController],
  providers: [ReportsService, ReportsClients],
})
export class ReportsModule {}
