import {
  Body,
  Controller,
  Get,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiConflictResponse,
  ApiCreatedResponse,
  ApiForbiddenResponse,
  ApiNotFoundResponse,
  ApiOkResponse,
  ApiTags,
  ApiUnauthorizedResponse,
} from '@nestjs/swagger';
import { CurrentUser, RequirePermissions } from '../common/decorators';
import type { JwtPayload } from '../common/interfaces';
import { Permission } from '../common/rbac/permission.constants';
import { CreateUserDto, UpdateUserDto } from './dto';
import { UserDetailEntity, UserListItemEntity } from './entities';
import { UsersService } from './users.service';

@ApiTags('users')
@ApiBearerAuth()
@ApiUnauthorizedResponse({ description: 'Missing or invalid access token' })
@ApiForbiddenResponse({
  description:
    'Requires users.manage. Also returned when a non-owner touches an OWNER, or a user edits their own status, role or password.',
})
@RequirePermissions(Permission.USERS_MANAGE)
@Controller('users')
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @Get()
  @ApiOkResponse({ type: UserListItemEntity, isArray: true })
  findAll(@CurrentUser() actor: JwtPayload): Promise<UserListItemEntity[]> {
    return this.usersService.findAll(actor.businessId);
  }

  @Get(':id')
  @ApiOkResponse({ type: UserDetailEntity })
  @ApiNotFoundResponse({ description: 'User not found in this business' })
  findOne(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() actor: JwtPayload,
  ): Promise<UserDetailEntity> {
    return this.usersService.findOne(id, actor.businessId);
  }

  @Post()
  @ApiCreatedResponse({ type: UserDetailEntity })
  @ApiConflictResponse({ description: 'Email already registered' })
  @ApiNotFoundResponse({ description: 'Role not found in this business' })
  create(
    @Body() dto: CreateUserDto,
    @CurrentUser() actor: JwtPayload,
  ): Promise<UserDetailEntity> {
    return this.usersService.create(dto, actor);
  }

  @Patch(':id')
  @ApiOkResponse({ type: UserDetailEntity })
  @ApiNotFoundResponse({
    description: 'User or role not found in this business',
  })
  @ApiConflictResponse({
    description:
      'Email already registered, or the business would lose its last active owner',
  })
  update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateUserDto,
    @CurrentUser() actor: JwtPayload,
  ): Promise<UserDetailEntity> {
    return this.usersService.update(id, dto, actor);
  }
}
