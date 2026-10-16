import jwt from 'jsonwebtoken';
import { jwtAudience, jwtIssuer, jwtSecret } from './env';
import { parseJwtPayload, type JwtPayload } from './identity';

export function readBearerToken(header: string | undefined): string | null {
  if (!header) {
    return null;
  }
  const [scheme, token] = header.split(' ');
  if (scheme !== 'Bearer' || !token) {
    return null;
  }
  return token;
}

export function verifyAccessToken(token: string): JwtPayload {
  const decoded = jwt.verify(token, jwtSecret(), {
    algorithms: ['HS256'],
    issuer: jwtIssuer(),
    audience: jwtAudience(),
  });
  return parseJwtPayload(decoded);
}
