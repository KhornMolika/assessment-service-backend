import {
  Body,
  Controller,
  HttpCode,
  HttpStatus,
  Post,
  UseGuards,
} from '@nestjs/common';

import { AuthService } from './auth.service';
import { TokenRequestDto } from './dto/token-request.dto';
import { TokenResponseDto } from './dto/token-response.dto';
import { Public } from './guards/public.decorator';
import { AuthThrottlerGuard } from './guards/auth-throttler.guard';

@Controller('auth')
@UseGuards(AuthThrottlerGuard)
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Public() // exempt from global ClientAuthGuard
  @Post('token')
  @HttpCode(HttpStatus.OK)
  async token(@Body() dto: TokenRequestDto): Promise<TokenResponseDto> {
    return this.authService.token(dto);
  }
}
