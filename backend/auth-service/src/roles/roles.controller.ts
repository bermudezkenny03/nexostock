import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  Req,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { RequirePermissions } from '../common/decorators/require-permissions.decorator';
import { Permission } from '../common/rbac/permission.constants';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { PermissionsGuard } from '../common/guards/permissions.guard';
import type { AuthenticatedRequest } from '../common/interfaces';
import { CreateRoleDto, UpdateRoleDto } from './dto';
import type { RoleDetailEntity, RoleListItemEntity } from './entities';
import { RolesService } from './roles.service';

@ApiTags('roles')
@ApiBearerAuth()
@Controller('roles')
@UseGuards(JwtAuthGuard, PermissionsGuard)
export class RolesController {
  constructor(private readonly rolesService: RolesService) {}

  @Get()
  @RequirePermissions(Permission.ROLES_MANAGE)
  findAll(@Req() req: AuthenticatedRequest): Promise<RoleListItemEntity[]> {
    return this.rolesService.findAll(req.user.businessId);
  }

  @Get(':id')
  @RequirePermissions(Permission.ROLES_MANAGE)
  findOne(
    @Param('id', ParseUUIDPipe) id: string,
    @Req() req: AuthenticatedRequest,
  ): Promise<RoleDetailEntity> {
    return this.rolesService.findOne(id, req.user.businessId);
  }

  @Post()
  @RequirePermissions(Permission.ROLES_MANAGE)
  create(
    @Body() dto: CreateRoleDto,
    @Req() req: AuthenticatedRequest,
  ): Promise<RoleDetailEntity> {
    return this.rolesService.create(dto, req.user.businessId);
  }

  @Patch(':id')
  @RequirePermissions(Permission.ROLES_MANAGE)
  update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateRoleDto,
    @Req() req: AuthenticatedRequest,
  ): Promise<RoleDetailEntity> {
    return this.rolesService.update(id, dto, req.user.businessId);
  }

  @Delete(':id')
  @RequirePermissions(Permission.ROLES_MANAGE)
  @HttpCode(HttpStatus.NO_CONTENT)
  remove(
    @Param('id', ParseUUIDPipe) id: string,
    @Req() req: AuthenticatedRequest,
  ): Promise<void> {
    return this.rolesService.remove(id, req.user.businessId);
  }
}
