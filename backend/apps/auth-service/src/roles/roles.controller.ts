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
} from '@nestjs/common';
import {
  ApiBadRequestResponse,
  ApiBearerAuth,
  ApiConflictResponse,
  ApiCreatedResponse,
  ApiForbiddenResponse,
  ApiNoContentResponse,
  ApiNotFoundResponse,
  ApiOkResponse,
  ApiTags,
  ApiUnauthorizedResponse,
} from '@nestjs/swagger';
import { CurrentUser, RequirePermissions } from '../common/decorators';
import type { JwtPayload } from '../common/interfaces';
import { Permission } from '../common/rbac/permission.constants';
import { CreateRoleDto, UpdateRoleDto } from './dto';
import { RoleDetailEntity, RoleListItemEntity } from './entities';
import { RolesService } from './roles.service';

@ApiTags('roles')
@ApiBearerAuth()
@ApiUnauthorizedResponse({ description: 'Missing or invalid access token' })
@ApiForbiddenResponse({
  description:
    'Requires roles.manage (reading also accepts users.manage), or tries to grant a permission the caller does not hold',
})
@RequirePermissions(Permission.ROLES_MANAGE)
@Controller('roles')
export class RolesController {
  constructor(private readonly rolesService: RolesService) {}

  @Get()
  @RequirePermissions(Permission.ROLES_MANAGE, Permission.USERS_MANAGE)
  @ApiOkResponse({ type: RoleListItemEntity, isArray: true })
  findAll(@CurrentUser() actor: JwtPayload): Promise<RoleListItemEntity[]> {
    return this.rolesService.findAll(actor.businessId);
  }

  @Get(':id')
  @RequirePermissions(Permission.ROLES_MANAGE, Permission.USERS_MANAGE)
  @ApiOkResponse({ type: RoleDetailEntity })
  @ApiNotFoundResponse({ description: 'Role not found in this business' })
  findOne(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() actor: JwtPayload,
  ): Promise<RoleDetailEntity> {
    return this.rolesService.findOne(id, actor.businessId);
  }

  @Post()
  @ApiCreatedResponse({ type: RoleDetailEntity })
  @ApiBadRequestResponse({ description: 'Invalid role code' })
  @ApiConflictResponse({
    description: 'Role code already exists in this business',
  })
  @ApiNotFoundResponse({ description: 'One or more permissions not found' })
  create(
    @Body() dto: CreateRoleDto,
    @CurrentUser() actor: JwtPayload,
  ): Promise<RoleDetailEntity> {
    return this.rolesService.create(dto, actor);
  }

  @Patch(':id')
  @ApiOkResponse({ type: RoleDetailEntity })
  @ApiBadRequestResponse({ description: 'System roles cannot be modified' })
  @ApiNotFoundResponse({
    description: 'Role not found, or one or more permissions not found',
  })
  update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateRoleDto,
    @CurrentUser() actor: JwtPayload,
  ): Promise<RoleDetailEntity> {
    return this.rolesService.update(id, dto, actor);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiNoContentResponse({ description: 'Role deleted' })
  @ApiBadRequestResponse({ description: 'System roles cannot be deleted' })
  @ApiConflictResponse({ description: 'Role is still assigned to users' })
  @ApiNotFoundResponse({ description: 'Role not found in this business' })
  remove(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() actor: JwtPayload,
  ): Promise<void> {
    return this.rolesService.remove(id, actor.businessId);
  }
}
