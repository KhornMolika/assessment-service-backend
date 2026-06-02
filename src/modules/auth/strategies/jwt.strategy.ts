import { Injectable, UnauthorizedException } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { ConfigService } from '@nestjs/config';
import { ClientRepository } from '../../clients/client.repository';
import { Client } from '../../clients/client.entity';
import { CacheService } from '../../../common/cache/cache.service';

export interface JwtPayload {
  sub: string; // clientId (UUID)
  slug: string;
  scopes: string[];
}

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy, 'jwt') {
  private readonly tokenTtl: number;

  constructor(
    config: ConfigService,
    private readonly clientRepo: ClientRepository,
    private readonly cacheService: CacheService,
  ) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: config.getOrThrow<string>('app.auth.jwtSecret'),
    });
    this.tokenTtl = config.get<number>('app.auth.accessTokenTtl', 3600);
  }

  // Called after signature + expiry are verified by passport-jwt
  // Re-fetches Client to catch suspension that happened after token was issued
  // Uses CacheService to avoid hitting Postgres on every protected route
  async validate(payload: JwtPayload): Promise<Client> {
    const cacheKey = `client:${payload.sub}`;

    const client = await this.cacheService.getOrSet<Client | null>(
      cacheKey,
      this.tokenTtl,
      async () => {
        const found = await this.clientRepo.findByClientId(payload.sub);
        if (!found || !found.isActive) {
          return null; // cache the null result too for inactive clients
        }
        return found;
      }
    );

    if (!client) {
      throw new UnauthorizedException('Client is inactive or does not exist');
    }
    
    return client; // becomes request.client
  }
}
