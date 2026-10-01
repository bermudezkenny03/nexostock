import { createParamDecorator, type ExecutionContext } from '@nestjs/common';
import type { AuthenticatedRequest, JwtPayload } from '../interfaces';

export const CurrentUser = createParamDecorator(
  (_data: unknown, context: ExecutionContext): JwtPayload =>
    context.switchToHttp().getRequest<AuthenticatedRequest>().user,
);
