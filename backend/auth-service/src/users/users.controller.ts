import {
  Body,
  Controller,
  Get,
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
import { CreateUserDto, UpdateUserDto } from './dto';
import type { UserDetailEntity, UserListItemEntity } from './entities';
import { UsersService } from './users.service';

@ApiTags('users')
@ApiBearerAuth()
@Controller('users')
@UseGuards(JwtAuthGuard, PermissionsGuard)
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @Get()
  @RequirePermissions(Permission.USERS_MANAGE)
  findAll(@Req() req: AuthenticatedRequest): Promise<UserListItemEntity[]> {
    return this.usersService.findAll(req.user.businessId);
  }

  @Get(':id')
  @RequirePermissions(Permission.USERS_MANAGE)
  findOne(
    @Param('id', ParseUUIDPipe) id: string,
    @Req() req: AuthenticatedRequest,
  ): Promise<UserDetailEntity> {
    return this.usersService.findOne(id, req.user.businessId);
  }

  @Post()
  @RequirePermissions(Permission.USERS_MANAGE)
  create(
    @Body() dto: CreateUserDto,
    @Req() req: AuthenticatedRequest,
  ): Promise<UserDetailEntity> {
    return this.usersService.create(dto, req.user.businessId);
  }

  @Patch(':id')
  @RequirePermissions(Permission.USERS_MANAGE)
  update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateUserDto,
    @Req() req: AuthenticatedRequest,
  ): Promise<UserDetailEntity> {
    return this.usersService.update(id, dto, req.user.businessId);
  }
}
