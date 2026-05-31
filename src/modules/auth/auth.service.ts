import { BadRequestException, Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { ClientService } from '../clients/client.service';
import { TokenRequestDto } from './dto/token-request.dto';
import { TokenResponseDto } from './dto/token-response.dto';
import { JwtPayload } from './strategies/jwt.strategy';

@Injectable()
export class AuthService {
  constructor(
    private readonly clientService: ClientService,
    private readonly jwtService: JwtService,
    private readonly config: ConfigService,
  ) {}

  async token(dto: TokenRequestDto): Promise<TokenResponseDto> {
    if (dto.grant_type !== 'client_credentials') {
      throw new BadRequestException(`Unsupported grant type: '${dto.grant_type}'. Only 'client_credentials' is supported.`);
    }

    // verifySecret() returns null for wrong secret AND for inactive clients
    // — no distinction to prevent information leakage
    const client = await this.clientService.verifySecret(dto.clientId, dto.clientSecret);
    if (!client) {
      throw new UnauthorizedException('Authentication failed: Invalid client credentials or client is suspended');
    }

    const expiresIn = this.config.get<number>('app.auth.accessTokenTtl', 3600);

    const payload: JwtPayload = {
      sub: client.clientId,
      slug: client.slug,
      scopes: client.scopes ?? [],
    };

    const access_token = await this.jwtService.signAsync(payload, { expiresIn });

    return { access_token, token_type: 'Bearer', expires_in: expiresIn };
  }
}
