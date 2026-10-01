import { Injectable } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { jwtAudience, jwtIssuer, jwtSecret } from '../config/jwt.config';
import { parseJwtPayload, type JwtPayload } from '../interfaces';

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor() {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      algorithms: ['HS256'],
      secretOrKey: jwtSecret(),
      issuer: jwtIssuer(),
      audience: jwtAudience(),
    });
  }

  validate(payload: unknown): JwtPayload {
    return parseJwtPayload(payload);
  }
}
