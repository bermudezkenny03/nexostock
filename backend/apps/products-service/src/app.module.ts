import { Module } from '@nestjs/common';
import { APP_GUARD } from '@nestjs/core';
import {
  JwtAuthGuard,
  PermissionsGuard,
  ServiceSecurityModule,
} from '@nexostock/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { ProductsModule } from './infrastructure/products.module';
import { PrismaModule } from './infrastructure/persistence/prisma.module';

@Module({
  imports: [PrismaModule, ServiceSecurityModule, ProductsModule],
  controllers: [AppController],
  providers: [
    AppService,
    { provide: APP_GUARD, useClass: JwtAuthGuard },
    { provide: APP_GUARD, useClass: PermissionsGuard },
  ],
})
export class AppModule {}
