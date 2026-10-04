import { Controller, Get } from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiForbiddenResponse,
  ApiOkResponse,
  ApiTags,
  ApiUnauthorizedResponse,
} from '@nestjs/swagger';
import { CurrentUser, RequirePermissions } from '../common/decorators';
import type { JwtPayload } from '../common/interfaces';
import {
  isPlatformBusiness,
  Permission,
} from '../common/rbac/permission.constants';
import { CatalogService } from './catalog.service';
import { ModuleTreeNodeEntity, PermissionCatalogItemEntity } from './entities';

@ApiTags('catalog')
@ApiBearerAuth()
@ApiUnauthorizedResponse({ description: 'Missing or invalid access token' })
@ApiForbiddenResponse({
  description: 'Requires modules.view, users.manage or roles.manage',
})
@RequirePermissions(
  Permission.MODULES_VIEW,
  Permission.USERS_MANAGE,
  Permission.ROLES_MANAGE,
)
@Controller()
export class CatalogController {
  constructor(private readonly catalogService: CatalogService) {}

  @Get('modules')
  @ApiOkResponse({ type: ModuleTreeNodeEntity, isArray: true })
  getModules(
    @CurrentUser() actor: JwtPayload,
  ): Promise<ModuleTreeNodeEntity[]> {
    return this.catalogService.getModuleTree(
      isPlatformBusiness(actor.businessId),
    );
  }

  @Get('permissions')
  @ApiOkResponse({ type: PermissionCatalogItemEntity, isArray: true })
  getPermissions(
    @CurrentUser() actor: JwtPayload,
  ): Promise<PermissionCatalogItemEntity[]> {
    return this.catalogService.getPermissions(
      isPlatformBusiness(actor.businessId),
    );
  }
}
