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
import { Permission } from '../common/rbac/permission.constants';
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
  @ApiOkResponse({
    type: ModuleTreeNodeEntity,
    isArray: true,
    description: 'Only the modules unlocked by the plan of the caller business',
  })
  getModules(
    @CurrentUser() actor: JwtPayload,
  ): Promise<ModuleTreeNodeEntity[]> {
    return this.catalogService.getModuleTree(actor.businessId);
  }

  @Get('permissions')
  @ApiOkResponse({
    type: PermissionCatalogItemEntity,
    isArray: true,
    description:
      'Only the permissions allowed by the plan of the caller business',
  })
  getPermissions(
    @CurrentUser() actor: JwtPayload,
  ): Promise<PermissionCatalogItemEntity[]> {
    return this.catalogService.getPermissions(actor.businessId);
  }
}
