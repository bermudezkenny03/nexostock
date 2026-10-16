import { Module } from '@nestjs/common';
import { BusinessProvisioningService } from './business-provisioning.service';
import { BusinessController } from './business.controller';
import { BusinessService } from './business.service';

@Module({
  controllers: [BusinessController],
  providers: [BusinessService, BusinessProvisioningService],
  exports: [BusinessProvisioningService],
})
export class BusinessModule {}
