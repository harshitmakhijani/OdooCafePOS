import { Body, Controller, Get, Post, UseGuards } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { Throttle } from '@nestjs/throttler';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import type { JwtAccessPayload } from '@cafe-pos/types';
import { Public } from '../common/decorators/public.decorator';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { AuthService } from './auth.service';
import { SignupDto } from './dto/signup.dto';
import { LoginDto } from './dto/login.dto';
import { RefreshDto } from './dto/refresh.dto';

@ApiTags('auth')
@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Public()
  @Throttle({ default: { ttl: 60_000, limit: 10 } })
  @Post('signup')
  @ApiOperation({ summary: 'Create an account (PRD §13.1)' })
  signup(@Body() dto: SignupDto) {
    return this.authService.signup(dto);
  }

  @Public()
  @Throttle({ default: { ttl: 60_000, limit: 10 } })
  @Post('login')
  @ApiOperation({ summary: 'Login with email or username (PRD §13.1)' })
  login(@Body() dto: LoginDto) {
    return this.authService.login(dto);
  }

  @Public()
  @Throttle({ default: { ttl: 60_000, limit: 30 } })
  @Post('refresh')
  @UseGuards(AuthGuard('jwt-refresh'))
  @ApiOperation({ summary: 'Exchange a refresh token for a new access token (PRD §13.1)' })
  refresh(
    @Body() dto: RefreshDto,
    @CurrentUser() user: JwtAccessPayload & { refreshToken?: string },
  ) {
    // The JwtRefreshStrategy attaches the raw refreshToken on the user payload
    return this.authService.refresh(user.sub, dto.refreshToken);
  }

  @Post('logout')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Invalidate the refresh token (PRD §13.1)' })
  logout(@CurrentUser('sub') userId: string) {
    return this.authService.logout(userId);
  }

  @Get('me')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Current user profile (PRD §13.1)' })
  me(@CurrentUser() user: JwtAccessPayload) {
    return this.authService.me(user.sub);
  }
}
