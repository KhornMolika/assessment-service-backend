import {
  BadRequestException,
  Injectable,
  UnauthorizedException,
  InternalServerErrorException,
  Logger,
  HttpException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { ClientService } from '../clients/client.service';
import { TokenRequestDto } from './dto/token-request.dto';
import { TokenResponseDto } from './dto/token-response.dto';
import { EmbedTokenRequestDto } from './dto/embed-token-request.dto';
import { JwtPayload } from './strategies/jwt.strategy';

@Injectable()
export class AuthService {
  private readonly logger = new Logger(AuthService.name);

  constructor(
    private readonly clientService: ClientService,
    private readonly jwtService: JwtService,
    private readonly config: ConfigService,
  ) {}

  async token(dto: TokenRequestDto): Promise<TokenResponseDto> {
    try {
      if (dto.grant_type !== 'client_credentials') {
        throw new BadRequestException(
          `Unsupported grant type: '${dto.grant_type}'. Only 'client_credentials' is supported.`,
        );
      }

      // verifySecret() returns null for wrong secret AND for inactive clients
      // — no distinction to prevent information leakage
      const client = await this.clientService.verifySecret(
        dto.clientId,
        dto.clientSecret,
      );
      if (!client) {
        throw new UnauthorizedException(
          'Authentication failed: Invalid client credentials or client is suspended',
        );
      }

      const expiresIn = this.config.get<number>(
        'app.auth.accessTokenTtl',
        3600,
      );

      const payload: JwtPayload = {
        sub: client.clientId,
        slug: client.slug,
        scopes: client.scopes ?? [],
      };

      const access_token = await this.jwtService.signAsync(payload, {
        expiresIn,
      });

      return { access_token, token_type: 'Bearer', expires_in: expiresIn };
    } catch (error) {
      if (error instanceof HttpException) {
        throw error;
      }
      this.logger.error(
        `Failed to generate token: ${(error as Error).message}`,
        (error as Error).stack,
      );
      throw new InternalServerErrorException(
        'An unexpected error occurred during authentication',
      );
    }
  }

  async embedToken(dto: EmbedTokenRequestDto): Promise<TokenResponseDto> {
    try {
      const client = await this.clientService.verifySecret(
        dto.clientId,
        dto.clientSecret,
      );
      if (!client) {
        throw new UnauthorizedException(
          'Authentication failed: Invalid client credentials or client is suspended',
        );
      }

      // Origin verification
      const allowedOrigins = client.allowedOrigins || [];
      if (!allowedOrigins.includes(dto.origin)) {
        throw new UnauthorizedException(
          `Authentication failed: Origin '${dto.origin}' is not allowed for this client.`,
        );
      }

      const expiresIn = this.config.get<number>(
        'app.auth.embedTokenTtl',
        7200, // 2 hours default
      );

      // Embed token payload
      const payload: JwtPayload = {
        sub: client.clientId,
        slug: client.slug,
        scopes: ['widget'], // Restricted scope
        origin: dto.origin,
      };

      if (dto.participantId) payload.participantId = dto.participantId;
      if (dto.participantName) payload.participantName = dto.participantName;

      const access_token = await this.jwtService.signAsync(payload, {
        expiresIn,
      });

      return { access_token, token_type: 'Bearer', expires_in: expiresIn };
    } catch (error) {
      if (error instanceof HttpException) {
        throw error;
      }
      this.logger.error(
        `Failed to generate embed token: ${(error as Error).message}`,
        (error as Error).stack,
      );
      throw new InternalServerErrorException(
        'An unexpected error occurred during embed authentication',
      );
    }
  }
}
