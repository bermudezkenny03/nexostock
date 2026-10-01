import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Post,
} from '@nestjs/common';
import {
  ApiBadRequestResponse,
  ApiBearerAuth,
  ApiConflictResponse,
  ApiCreatedResponse,
  ApiForbiddenResponse,
  ApiNoContentResponse,
  ApiOkResponse,
  ApiTags,
  ApiTooManyRequestsResponse,
  ApiUnauthorizedResponse,
} from '@nestjs/swagger';
import { Throttle } from '@nestjs/throttler';
import { CurrentUser, Public } from '../common/decorators';
import type { JwtPayload } from '../common/interfaces';
import { AuthService } from './auth.service';
import {
  ChangePasswordDto,
  LoginDto,
  LogoutDto,
  RefreshDto,
  RegisterBusinessDto,
} from './dto';
import {
  AuthUserEntity,
  LoginResponseEntity,
  RefreshResponseEntity,
} from './entities';

const ONE_MINUTE_MS = 60_000;
const ONE_HOUR_MS = 3_600_000;

@ApiTags('auth')
@ApiTooManyRequestsResponse({ description: 'Rate limit exceeded' })
@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Post('register')
  @Public()
  @Throttle({ default: { limit: 5, ttl: ONE_HOUR_MS } })
  @ApiCreatedResponse({
    type: LoginResponseEntity,
    description:
      'Creates a business (tenant) with its system roles and the caller as OWNER, then signs in.',
  })
  @ApiConflictResponse({ description: 'Email already registered' })
  @ApiForbiddenResponse({ description: 'Public registration is disabled' })
  register(@Body() dto: RegisterBusinessDto): Promise<LoginResponseEntity> {
    return this.authService.register(dto);
  }

  @Post('login')
  @Public()
  @HttpCode(HttpStatus.OK)
  @Throttle({ default: { limit: 5, ttl: ONE_MINUTE_MS } })
  @ApiOkResponse({ type: LoginResponseEntity })
  @ApiUnauthorizedResponse({ description: 'Invalid credentials' })
  @ApiForbiddenResponse({
    description: 'Correct password, but the user or the business is inactive',
  })
  login(@Body() dto: LoginDto): Promise<LoginResponseEntity> {
    return this.authService.login(dto);
  }

  @Post('refresh')
  @Public()
  @HttpCode(HttpStatus.OK)
  @Throttle({ default: { limit: 10, ttl: ONE_MINUTE_MS } })
  @ApiOkResponse({ type: RefreshResponseEntity })
  @ApiUnauthorizedResponse({
    description:
      'Invalid, expired or reused refresh token, or inactive user or business. Reuse revokes every session of the user.',
  })
  refresh(@Body() dto: RefreshDto): Promise<RefreshResponseEntity> {
    return this.authService.refresh(dto);
  }

  @Post('logout')
  @Public()
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiNoContentResponse({ description: 'Refresh token revoked' })
  logout(@Body() dto: LogoutDto): Promise<void> {
    return this.authService.logout(dto);
  }

  @Post('logout-all')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiBearerAuth()
  @ApiNoContentResponse({
    description: 'Every refresh token of the caller revoked',
  })
  @ApiUnauthorizedResponse({ description: 'Missing or invalid access token' })
  logoutAll(@CurrentUser() user: JwtPayload): Promise<void> {
    return this.authService.logoutAll(user.sub);
  }

  @Post('change-password')
  @HttpCode(HttpStatus.NO_CONTENT)
  @Throttle({ default: { limit: 5, ttl: ONE_MINUTE_MS } })
  @ApiBearerAuth()
  @ApiNoContentResponse({
    description: 'Password changed; every session of the caller is closed',
  })
  @ApiBadRequestResponse({
    description: 'Wrong current password or weak new password',
  })
  @ApiUnauthorizedResponse({ description: 'Missing or invalid access token' })
  changePassword(
    @CurrentUser() user: JwtPayload,
    @Body() dto: ChangePasswordDto,
  ): Promise<void> {
    return this.authService.changePassword(user.sub, dto);
  }

  @Get('me')
  @ApiBearerAuth()
  @ApiOkResponse({ type: AuthUserEntity })
  @ApiUnauthorizedResponse({
    description: 'Missing token, or inactive user or business',
  })
  me(@CurrentUser() user: JwtPayload): Promise<AuthUserEntity> {
    return this.authService.getProfile(user.sub);
  }
}
