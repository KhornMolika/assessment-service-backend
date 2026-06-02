import { Body, Controller, HttpCode, HttpStatus, Post, UseGuards } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { AuthService } from './auth.service';
import { TokenRequestDto } from './dto/token-request.dto';
import { TokenResponseDto } from './dto/token-response.dto';
import { Public } from './guards/public.decorator';
import { AuthThrottlerGuard } from './guards/auth-throttler.guard';

@ApiTags('Auth')
@Controller('auth')
@UseGuards(AuthThrottlerGuard)
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Public() // exempt from global ClientAuthGuard
  @Post('token')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'OAuth2 client credentials grant — returns Bearer token' })
  async token(@Body() dto: TokenRequestDto): Promise<TokenResponseDto> {
    return this.authService.token(dto);
  }
}
