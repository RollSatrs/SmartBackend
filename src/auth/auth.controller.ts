import {
  Body,
  Controller,
  Get,
  Post,
  Req,
  Res,
  UseGuards,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiConflictResponse,
  ApiCookieAuth,
  ApiCreatedResponse,
  ApiOkResponse,
  ApiOperation,
  ApiTags,
  ApiUnauthorizedResponse,
} from '@nestjs/swagger';
import { Throttle } from '@nestjs/throttler';
import { AuthService } from './auth.service';
import { RegisterDto } from './dto/register.dto';
import { LoginDto } from './dto/login.dto';
import { ForgotPasswordDto } from './dto/forgot-password.dto';
import { ResetPasswordDto } from './dto/reset-password.dto';
import type { Request, Response } from 'express';
import { JwtAuthGuard } from './jwt.guard';
import {
  AuthResponseDto,
  AuthUserDto,
  MessageResponseDto,
} from './dto/auth-response.dto';

const ACCESS_TOKEN_COOKIE_OPTIONS = {
  httpOnly: true,
  secure: process.env.NODE_ENV === 'production',
  sameSite: 'lax' as const,
  maxAge: 7 * 24 * 60 * 60 * 1000,
};

@ApiTags('auth')
@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @ApiOperation({ summary: 'Регистрация пользователя' })
  @ApiCreatedResponse({ type: AuthResponseDto })
  @ApiConflictResponse({ description: 'Email уже зарегистрирован' })
  @Throttle({ default: { limit: 5, ttl: 60_000 } })
  @Post('register')
  async register(
    @Body() params: RegisterDto,
    @Res({ passthrough: true }) res: Response,
  ) {
    const result = await this.authService.register(params);
    res.cookie('access_token', result.accessToken, ACCESS_TOKEN_COOKIE_OPTIONS);
    return result;
  }

  @ApiOperation({ summary: 'Вход по email и паролю' })
  @ApiOkResponse({ type: AuthResponseDto })
  @ApiUnauthorizedResponse({ description: 'Неверный email или пароль' })
  @Throttle({ default: { limit: 5, ttl: 60_000 } })
  @Post('login')
  async login(
    @Body()
    params: LoginDto,
    @Res({ passthrough: true })
    res: Response,
  ) {
    const result = await this.authService.login(params);
    res.cookie('access_token', result.accessToken, ACCESS_TOKEN_COOKIE_OPTIONS);
    return result;
  }

  @ApiOperation({ summary: 'Получить текущего пользователя' })
  @ApiCookieAuth('access_token')
  @ApiBearerAuth()
  @ApiOkResponse({ type: AuthUserDto })
  @ApiUnauthorizedResponse({
    description: 'Токен отсутствует или недействителен',
  })
  @Get('me')
  @UseGuards(JwtAuthGuard)
  async me(@Req() req: Request) {
    return this.authService.getMe(req.user!.id);
  }

  @ApiOperation({ summary: 'Выйти из аккаунта' })
  @ApiCookieAuth('access_token')
  @ApiBearerAuth()
  @ApiOkResponse({ type: MessageResponseDto })
  @Post('logout')
  @UseGuards(JwtAuthGuard)
  logout(@Res({ passthrough: true }) res: Response) {
    res.clearCookie('access_token');
    return { message: 'Выход выполнен' };
  }

  @ApiOperation({ summary: 'Запросить ссылку для сброса пароля' })
  @ApiOkResponse({ type: MessageResponseDto })
  @Throttle({ default: { limit: 3, ttl: 60_000 } })
  @Post('forgot-password')
  async forgotPassword(@Body() params: ForgotPasswordDto) {
    return this.authService.forgotPassword(params);
  }

  @ApiOperation({ summary: 'Установить новый пароль' })
  @ApiOkResponse({ type: MessageResponseDto })
  @Post('reset-password')
  async resetPassword(@Body() params: ResetPasswordDto) {
    return this.authService.resetPassword(params);
  }
}
