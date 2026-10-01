import { Global, Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { PassportModule } from '@nestjs/passport';
import { AccessService } from './access';
import { JwtAuthGuard } from './guards/jwt-auth.guard';
import { PermissionsGuard } from './guards/permissions.guard';
import { JwtStrategy } from './strategies/jwt.strategy';

@Global()
@Module({
  imports: [
    PassportModule.register({ defaultStrategy: 'jwt' }),
    JwtModule.register({
      secret: process.env.JWT_SECRET ?? 'dev-jwt-secret-change-in-production',
      signOptions: {
        expiresIn: (process.env.JWT_EXPIRES_IN ?? '15m') as `${number}${'s' | 'm' | 'h' | 'd'}`,
      },
    }),
  ],
  providers: [JwtStrategy, AccessService, JwtAuthGuard, PermissionsGuard],
  exports: [JwtModule, AccessService, JwtAuthGuard, PermissionsGuard],
})
export class CommonModule {}
