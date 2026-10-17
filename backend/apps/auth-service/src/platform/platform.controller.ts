import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiForbiddenResponse,
  ApiNoContentResponse,
  ApiNotFoundResponse,
  ApiOkResponse,
  ApiTags,
  ApiUnauthorizedResponse,
} from '@nestjs/swagger';
import { PlanEntity, PlatformPlanRequestEntity } from '../business/entities';
import { CurrentUser, RequirePermissions } from '../common/decorators';
import type { JwtPayload } from '../common/interfaces';
import { Permission } from '../common/rbac/permission.constants';
import {
  ChangeBusinessPlanDto,
  DecidePlanRequestDto,
  ListAuditLogsQueryDto,
  UpdatePlanDto,
  ListBusinessesQueryDto,
  ResetOwnerPasswordDto,
  UpdateBusinessStatusDto,
} from './platform.dto';
import {
  PlatformAuditLogPageEntity,
  PlatformBusinessEntity,
  PlatformBusinessPageEntity,
} from './platform.entities';
import { PlatformGuard } from './platform.guard';
import { PlatformService } from './platform.service';

@ApiTags('platform')
@ApiBearerAuth()
@ApiUnauthorizedResponse({ description: 'Missing or invalid access token' })
@ApiForbiddenResponse({
  description:
    'Requires platform.manage and membership in the provider business',
})
@RequirePermissions(Permission.PLATFORM_MANAGE)
@UseGuards(PlatformGuard)
@Controller('platform')
export class PlatformController {
  constructor(private readonly platformService: PlatformService) {}

  @Get('plans')
  @ApiOkResponse({ type: PlanEntity, isArray: true })
  listPlans(): Promise<PlanEntity[]> {
    return this.platformService.listPlans();
  }

  @Patch('plans/:code')
  @ApiOkResponse({ type: PlanEntity })
  @ApiNotFoundResponse({ description: 'Plan not found' })
  updatePlan(
    @Param('code') code: string,
    @Body() dto: UpdatePlanDto,
  ): Promise<PlanEntity> {
    return this.platformService.updatePlan(code, dto);
  }

  @Get('plan-requests')
  @ApiOkResponse({ type: PlatformPlanRequestEntity, isArray: true })
  listPlanRequests(): Promise<PlatformPlanRequestEntity[]> {
    return this.platformService.listPlanRequests();
  }

  @Post('plan-requests/:id/decision')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiNoContentResponse({ description: 'Request approved or rejected' })
  @ApiNotFoundResponse({ description: 'Request or plan not found' })
  decidePlanRequest(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: DecidePlanRequestDto,
    @CurrentUser() actor: JwtPayload,
  ): Promise<void> {
    return this.platformService.decidePlanRequest(id, dto, actor);
  }

  @Get('audit-logs')
  @ApiOkResponse({ type: PlatformAuditLogPageEntity })
  listAuditLogs(
    @Query() query: ListAuditLogsQueryDto,
  ): Promise<PlatformAuditLogPageEntity> {
    return this.platformService.listAuditLogs(query);
  }

  @Get('businesses')
  @ApiOkResponse({ type: PlatformBusinessPageEntity })
  listBusinesses(
    @Query() query: ListBusinessesQueryDto,
  ): Promise<PlatformBusinessPageEntity> {
    return this.platformService.listBusinesses(query);
  }

  @Get('businesses/:businessId')
  @ApiOkResponse({ type: PlatformBusinessEntity })
  @ApiNotFoundResponse({ description: 'Business not found' })
  getBusiness(
    @Param('businessId', ParseUUIDPipe) businessId: string,
  ): Promise<PlatformBusinessEntity> {
    return this.platformService.getBusiness(businessId);
  }

  @Patch('businesses/:businessId/status')
  @ApiOkResponse({
    type: PlatformBusinessEntity,
    description: 'Deactivating revokes every session of the business',
  })
  @ApiNotFoundResponse({ description: 'Business not found' })
  setStatus(
    @Param('businessId', ParseUUIDPipe) businessId: string,
    @Body() dto: UpdateBusinessStatusDto,
    @CurrentUser() actor: JwtPayload,
  ): Promise<PlatformBusinessEntity> {
    return this.platformService.setStatus(businessId, dto, actor);
  }

  @Patch('businesses/:businessId/plan')
  @ApiOkResponse({ type: PlatformBusinessEntity })
  @ApiNotFoundResponse({ description: 'Business or plan not found' })
  changePlan(
    @Param('businessId', ParseUUIDPipe) businessId: string,
    @Body() dto: ChangeBusinessPlanDto,
    @CurrentUser() actor: JwtPayload,
  ): Promise<PlatformBusinessEntity> {
    return this.platformService.changePlan(businessId, dto, actor);
  }

  @Post('businesses/:businessId/owners/:userId/password')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiNoContentResponse({
    description: 'Password replaced; every session of the owner is closed',
  })
  @ApiNotFoundResponse({ description: 'Business or owner not found' })
  resetOwnerPassword(
    @Param('businessId', ParseUUIDPipe) businessId: string,
    @Param('userId', ParseUUIDPipe) userId: string,
    @Body() dto: ResetOwnerPasswordDto,
    @CurrentUser() actor: JwtPayload,
  ): Promise<void> {
    return this.platformService.resetOwnerPassword(
      businessId,
      userId,
      dto,
      actor,
    );
  }
}
