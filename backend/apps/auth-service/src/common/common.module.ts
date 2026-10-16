import { Global, Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { PassportModule } from '@nestjs/passport';
import { AccessService } from './access';
import { jwtAudience, jwtIssuer, jwtSecret } from './config/jwt.config';
import { JwtStrategy } from './strategies/jwt.strategy';

@Global()
@Module({
  imports: [
    PassportModule.register({ defaultStrategy: 'jwt' }),
    JwtModule.register({
      secret: jwtSecret(),
      signOptions: {
        expiresIn: (process.env.JWT_EXPIRES_IN ?? '15m') as `${number}${'s' | 'm' | 'h' | 'd'}`,
        issuer: jwtIssuer(),
        audience: jwtAudience(),
      },
    }),
  ],
  providers: [JwtStrategy, AccessService],
  exports: [JwtModule, AccessService],
})
export class CommonModule {}
