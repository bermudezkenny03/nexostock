import { Module } from '@nestjs/common';
import { APP_GUARD } from '@nestjs/core';
import {
  JwtAuthGuard,
  PermissionsGuard,
  ServiceSecurityModule,
} from '@nexostock/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { InventoryModule } from './infrastructure/inventory.module';
import { PrismaModule } from './infrastructure/persistence/prisma.module';

@Module({
  imports: [PrismaModule, ServiceSecurityModule, InventoryModule],
  controllers: [AppController],
  providers: [
    AppService,
    { provide: APP_GUARD, useClass: JwtAuthGuard },
    { provide: APP_GUARD, useClass: PermissionsGuard },
  ],
})
export class AppModule {}
