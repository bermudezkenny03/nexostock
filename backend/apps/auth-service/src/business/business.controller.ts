import { Body, Controller, Get, Patch } from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiForbiddenResponse,
  ApiNotFoundResponse,
  ApiOkResponse,
  ApiTags,
  ApiUnauthorizedResponse,
} from '@nestjs/swagger';
import { CurrentUser, RequirePermissions } from '../common/decorators';
import type { JwtPayload } from '../common/interfaces';
import { Permission } from '../common/rbac/permission.constants';
import { BusinessService } from './business.service';
import { UpdateBusinessDto } from './dto';
import { BusinessProfileEntity } from './entities';

@ApiTags('business')
@ApiBearerAuth()
@ApiUnauthorizedResponse({ description: 'Missing or invalid access token' })
@Controller('business')
export class BusinessController {
  constructor(private readonly businessService: BusinessService) {}

  @Get('me')
  @ApiOkResponse({ type: BusinessProfileEntity })
  @ApiNotFoundResponse({ description: 'Business not found' })
  getMe(@CurrentUser() actor: JwtPayload): Promise<BusinessProfileEntity> {
    return this.businessService.getProfile(actor.businessId);
  }

  @Patch('me')
  @RequirePermissions(Permission.BUSINESS_MANAGE)
  @ApiOkResponse({ type: BusinessProfileEntity })
  @ApiForbiddenResponse({ description: 'Requires permission business.manage' })
  @ApiNotFoundResponse({ description: 'Business not found' })
  updateMe(
    @CurrentUser() actor: JwtPayload,
    @Body() dto: UpdateBusinessDto,
  ): Promise<BusinessProfileEntity> {
    return this.businessService.updateProfile(actor.businessId, dto);
  }
}
