import { Module } from '@nestjs/common';
import { APP_GUARD } from '@nestjs/core';
import { ThrottlerGuard, ThrottlerModule } from '@nestjs/throttler';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { AuthModule } from './auth/auth.module';
import { BusinessModule } from './business/business.module';
import { CatalogModule } from './catalog/catalog.module';
import { CommonModule } from './common/common.module';
import { JwtAuthGuard, PermissionsGuard } from './common/guards';
import { PrismaModule } from './prisma/prisma.module';
import { RolesModule } from './roles/roles.module';
import { UsersModule } from './users/users.module';

@Module({
  imports: [
    ThrottlerModule.forRoot({
      throttlers: [
        {
          ttl: Number.parseInt(process.env.THROTTLE_TTL ?? '60000', 10),
          limit: Number.parseInt(process.env.THROTTLE_LIMIT ?? '100', 10),
        },
      ],
      skipIf: () => process.env.NODE_ENV === 'test',
    }),
    PrismaModule,
    CommonModule,
    AuthModule,
    BusinessModule,
    UsersModule,
    RolesModule,
    CatalogModule,
  ],
  controllers: [AppController],
  providers: [
    AppService,
    { provide: APP_GUARD, useClass: ThrottlerGuard },
    { provide: APP_GUARD, useClass: JwtAuthGuard },
    { provide: APP_GUARD, useClass: PermissionsGuard },
  ],
})
export class AppModule {}
