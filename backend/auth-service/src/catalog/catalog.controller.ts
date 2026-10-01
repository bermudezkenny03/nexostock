import { Controller, Get, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { RequirePermissions } from '../common/decorators/require-permissions.decorator';
import { Permission } from '../common/rbac/permission.constants';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { PermissionsGuard } from '../common/guards/permissions.guard';
import { CatalogService } from './catalog.service';
import type {
  ModuleTreeNodeEntity,
  PermissionCatalogItemEntity,
} from './entities';

@ApiTags('catalog')
@ApiBearerAuth()
@Controller()
@UseGuards(JwtAuthGuard, PermissionsGuard)
export class CatalogController {
  constructor(private readonly catalogService: CatalogService) {}

  @Get('modules')
  @RequirePermissions(Permission.MODULES_VIEW, Permission.USERS_MANAGE)
  getModules(): Promise<ModuleTreeNodeEntity[]> {
    return this.catalogService.getModuleTree();
  }

  @Get('permissions')
  @RequirePermissions(Permission.MODULES_VIEW, Permission.USERS_MANAGE)
  getPermissions(): Promise<PermissionCatalogItemEntity[]> {
    return this.catalogService.getPermissions();
  }
}
