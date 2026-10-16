import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
} from '@nestjs/common';
import type { AuthenticatedRequest } from '../common/interfaces';
import {
  isPlatformBusiness,
  Permission,
} from '../common/rbac/permission.constants';

@Injectable()
export class PlatformGuard implements CanActivate {
  canActivate(context: ExecutionContext): boolean {
    const user = context.switchToHttp().getRequest<AuthenticatedRequest>().user;
    const allowed =
      user !== undefined &&
      isPlatformBusiness(user.businessId) &&
      user.permissions.includes(Permission.PLATFORM_MANAGE);

    if (!allowed) {
      throw new ForbiddenException(
        'Solo el equipo de NexoStock puede usar esta ruta',
      );
    }
    return true;
  }
}
