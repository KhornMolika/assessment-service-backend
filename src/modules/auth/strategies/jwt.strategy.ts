import { Injectable, UnauthorizedException } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { ConfigService } from '@nestjs/config';
import { ClientRepository } from '../../clients/client.repository';
import { Client } from '../../clients/client.entity';

export interface JwtPayload {
  sub: string; // clientId (UUID)
  slug: string;
  scopes: string[];
}

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy, 'jwt') {
  constructor(
    config: ConfigService,
    private readonly clientRepo: ClientRepository,
  ) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: config.getOrThrow<string>('app.auth.jwtSecret'),
    });
  }

  // Called after signature + expiry are verified by passport-jwt
  // Re-fetches Client to catch suspension that happened after token was issued
  async validate(payload: JwtPayload): Promise<Client> {
    const client = await this.clientRepo.findByClientId(payload.sub);
    if (!client || !client.isActive) {
      throw new UnauthorizedException('Client is inactive or does not exist');
    }
    return client; // becomes request.client
  }
}
