# Auth Scenario — OAuth2 Client Credentials Grant
## NBFSA Assessment Service

---

## Scenario Overview

This is a **server-to-server SaaS API**. There are no human end-users logging in.
Clients are organisations (e.g. an e-learning platform, an HR system) that are
**manually onboarded** by a super admin. Each client authenticates with a
`clientId` + `clientSecret` to obtain a short-lived JWT, then calls the API using
`Authorization: Bearer <token>`.

```
Client Platform                 Assessment Service API
      │                                   │
      │  POST /auth/token                 │
      │  { clientId, clientSecret,        │
      │    grant_type: "client_credentials" }
      │ ─────────────────────────────────>│
      │                                   │  1. Look up Client by clientId
      │                                   │  2. argon2id.verify(secret, hash)
      │                                   │  3. Check isActive
      │                                   │  4. Sign JWT (sub, slug, scopes)
      │  { access_token, expires_in }     │
      │ <─────────────────────────────────│
      │                                   │
      │  GET /assessments                 │
      │  Authorization: Bearer <token>    │
      │ ─────────────────────────────────>│
      │                                   │  5. JwtStrategy.validate()
      │                                   │  6. Re-fetch Client (isActive check)
      │                                   │  7. Attach to request.user
      │  200 { data }                     │
      │ <─────────────────────────────────│
```

**No refresh tokens.** Client credentials grants re-authenticate directly when
the access token expires. Short TTL (1 hour default) is fine because re-auth
is a single API call with no human interaction.

---

## File Structure

```
src/
├── modules/
│   ├── client/                         # Client management (super admin)
│   │   ├── client.module.ts
│   │   ├── client.controller.ts        # CRUD + rotate-secret + suspend/activate
│   │   ├── client.service.ts           # argon2id hash, secret generation
│   │   ├── client.repository.ts
│   │   ├── entities/
│   │   │   └── client.entity.ts
│   │   └── dto/
│   │       ├── create-client.dto.ts
│   │       ├── update-client.dto.ts
│   │       └── client-response.dto.ts  # Excludes clientSecretHash always
│   │
│   └── auth/                           # Token issuance + request protection
│       ├── auth.module.ts
│       ├── auth.controller.ts          # POST /auth/token only
│       ├── auth.service.ts             # token() — validates + signs JWT
│       ├── strategies/
│       │   └── jwt.strategy.ts         # Validates Bearer token on every request
│       ├── guards/
│       │   ├── client-auth.guard.ts    # Global guard — extends AuthGuard('jwt')
│       │   └── public.decorator.ts     # @Public() — opt-out of global guard
│       └── dto/
│           ├── token-request.dto.ts
│           └── token-response.dto.ts
```

---

## Packages

```bash
npm install @nestjs/passport @nestjs/jwt passport passport-jwt argon2
npm install -D @types/passport-jwt
```

> Use **argon2id** over bcrypt. It is memory-hard (GPU-resistant), won the
> Password Hashing Competition, and is OWASP's preferred algorithm. bcrypt has
> no memory hardness and weak GPU resistance by comparison.

---

## Client Entity

```typescript
// client/entities/client.entity.ts
import { Column, Entity } from 'typeorm';
import { SystemBaseEntity } from '../../common/entities/system-base.entity';

@Entity('clients')
export class Client extends SystemBaseEntity {
  @Column({ type: 'varchar' })
  name!: string;

  @Column({ type: 'varchar', unique: true })
  slug!: string;

  // UUID generated at creation — this is what goes into the JWT sub claim
  @Column({ type: 'uuid', unique: true })
  clientId!: string;

  // argon2id hash of the raw secret — never expose this field
  @Column({ type: 'varchar' })
  clientSecretHash!: string;

  @Column({ type: 'boolean', default: true })
  isActive!: boolean;

  @Column('text', { array: true, nullable: true })
  allowedOrigins!: string[];

  @Column('text', { array: true, nullable: true })
  scopes!: string[];

  @Column({ type: 'varchar', nullable: true })
  webhookUrl!: string | null;

  @Column({ type: 'varchar', nullable: true })
  webhookSecret!: string | null;
}
```

---

## Client DTOs

```typescript
// client/dto/create-client.dto.ts
import { IsString, IsArray, IsOptional, IsUrl, ArrayUnique, IsNotEmpty } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateClientDto {
  @ApiProperty({ example: 'Acme E-Learning Platform' })
  @IsString() @IsNotEmpty()
  name!: string;

  @ApiProperty({ example: 'acme-elearning' })
  @IsString() @IsNotEmpty()
  slug!: string;

  @ApiPropertyOptional({ example: ['https://acme.com'] })
  @IsArray() @IsUrl({}, { each: true }) @ArrayUnique() @IsOptional()
  allowedOrigins?: string[];

  @ApiPropertyOptional({ example: ['assessments:read', 'assessments:write'] })
  @IsArray() @IsString({ each: true }) @ArrayUnique() @IsOptional()
  scopes?: string[];

  @ApiPropertyOptional()
  @IsUrl() @IsOptional()
  webhookUrl?: string;
}
```

```typescript
// client/dto/update-client.dto.ts
import { PartialType, OmitType } from '@nestjs/swagger';
import { CreateClientDto } from './create-client.dto';

// slug is immutable after creation — omit it from updates
export class UpdateClientDto extends PartialType(
  OmitType(CreateClientDto, ['slug'] as const),
) {}
```

```typescript
// client/dto/client-response.dto.ts
import { Expose, Exclude } from 'class-transformer';
import { ApiProperty } from '@nestjs/swagger';

// Base response — clientSecretHash is never exposed (not decorated with @Expose)
@Exclude()
export class ClientResponseDto {
  @Expose() @ApiProperty() id!: string;
  @Expose() @ApiProperty() clientId!: string;
  @Expose() @ApiProperty() name!: string;
  @Expose() @ApiProperty() slug!: string;
  @Expose() @ApiProperty() isActive!: boolean;
  @Expose() @ApiProperty() scopes!: string[];
  @Expose() @ApiProperty() allowedOrigins!: string[];
  @Expose() @ApiProperty() webhookUrl!: string | null;
  @Expose() @ApiProperty() createdAt!: Date;
}

// Returned ONCE at creation and at secret rotation — never again
export class ClientCreatedResponseDto extends ClientResponseDto {
  @Expose() @ApiProperty({ description: 'Raw secret — shown once, store securely' })
  clientSecret!: string;
}
```

---

## Client Repository

```typescript
// client/client.repository.ts
import { Injectable } from '@nestjs/common';
import { DataSource, Repository } from 'typeorm';
import { Client } from './entities/client.entity';

@Injectable()
export class ClientRepository extends Repository<Client> {
  constructor(private readonly dataSource: DataSource) {
    super(Client, dataSource.createEntityManager());
  }

  async findByClientId(clientId: string): Promise<Client | null> {
    return this.findOne({ where: { clientId } });
  }

  async findBySlug(slug: string): Promise<Client | null> {
    return this.findOne({ where: { slug } });
  }
}
```

---

## Client Service

```typescript
// client/client.service.ts
import { ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import * as argon2 from 'argon2';
import { randomUUID } from 'crypto';
import { ClientRepository } from './client.repository';
import { CreateClientDto } from './dto/create-client.dto';
import { UpdateClientDto } from './dto/update-client.dto';
import { Client } from './entities/client.entity';

export interface CreatedClientResult {
  client: Client;
  rawSecret: string; // returned once to caller — never stored raw
}

@Injectable()
export class ClientService {
  // Argon2id options — OWASP minimum is memoryCost:19456, timeCost:2
  // 64 MB / 3 iterations is comfortably above minimum for infrequent server-to-server auth
  private readonly argon2Options: argon2.Options & { raw?: false } = {
    type: argon2.argon2id,
    memoryCost: 64 * 1024, // 64 MB
    timeCost: 3,
    parallelism: 1,
  };

  constructor(private readonly clientRepo: ClientRepository) {}

  async create(dto: CreateClientDto): Promise<CreatedClientResult> {
    const existing = await this.clientRepo.findBySlug(dto.slug);
    if (existing) throw new ConflictException(`Slug "${dto.slug}" is already taken`);

    const rawSecret = this.generateSecret();
    const clientSecretHash = await argon2.hash(rawSecret, this.argon2Options);

    const client = this.clientRepo.create({
      ...dto,
      clientId: randomUUID(),
      clientSecretHash,
      isActive: true,
    });

    return { client: await this.clientRepo.save(client), rawSecret };
  }

  async findAll(): Promise<Client[]> {
    return this.clientRepo.find({ order: { createdAt: 'DESC' } });
  }

  async findOne(id: string): Promise<Client> {
    const client = await this.clientRepo.findOne({ where: { id } });
    if (!client) throw new NotFoundException(`Client ${id} not found`);
    return client;
  }

  async update(id: string, dto: UpdateClientDto): Promise<Client> {
    const client = await this.findOne(id);
    Object.assign(client, dto);
    return this.clientRepo.save(client);
  }

  async rotateSecret(id: string): Promise<CreatedClientResult> {
    const client = await this.findOne(id);
    const rawSecret = this.generateSecret();
    client.clientSecretHash = await argon2.hash(rawSecret, this.argon2Options);
    return { client: await this.clientRepo.save(client), rawSecret };
  }

  async setActive(id: string, isActive: boolean): Promise<Client> {
    const client = await this.findOne(id);
    client.isActive = isActive;
    return this.clientRepo.save(client);
  }

  // Used by AuthService.token() — single source of truth for credential validation
  async verifySecret(clientId: string, rawSecret: string): Promise<Client | null> {
    const client = await this.clientRepo.findByClientId(clientId);
    if (!client || !client.isActive) return null;
    const valid = await argon2.verify(client.clientSecretHash, rawSecret, this.argon2Options);
    return valid ? client : null;
    // Note: do NOT distinguish "inactive" from "wrong secret" — both return null
    // This prevents information leakage about whether a clientId exists
  }

  // 64 hex chars (32 bytes entropy) — cryptographically unguessable
  private generateSecret(): string {
    return randomUUID().replace(/-/g, '') + randomUUID().replace(/-/g, '');
  }
}
```

---

## Client Controller

```typescript
// client/client.controller.ts
import {
  Body, Controller, Get, HttpCode, HttpStatus,
  Param, ParseUUIDPipe, Patch, Post,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { plainToInstance } from 'class-transformer';
import { ClientService } from './client.service';
import { CreateClientDto } from './dto/create-client.dto';
import { UpdateClientDto } from './dto/update-client.dto';
import { ClientCreatedResponseDto, ClientResponseDto } from './dto/client-response.dto';

@ApiTags('Clients')
@ApiBearerAuth()
@Controller('clients')
// ⚠️ Add a super-admin scope guard here once super admin is implemented:
// @UseGuards(ScopeGuard)  @RequireScope('clients:manage')
export class ClientController {
  constructor(private readonly clientService: ClientService) {}

  @Post()
  @ApiOperation({ summary: 'Provision new client — secret shown once' })
  async create(@Body() dto: CreateClientDto): Promise<ClientCreatedResponseDto> {
    const { client, rawSecret } = await this.clientService.create(dto);
    return plainToInstance(
      ClientCreatedResponseDto,
      { ...client, clientSecret: rawSecret },
      { excludeExtraneousValues: true },
    );
  }

  @Get()
  async findAll(): Promise<ClientResponseDto[]> {
    const clients = await this.clientService.findAll();
    return plainToInstance(ClientResponseDto, clients, { excludeExtraneousValues: true });
  }

  @Get(':id')
  async findOne(@Param('id', ParseUUIDPipe) id: string): Promise<ClientResponseDto> {
    const client = await this.clientService.findOne(id);
    return plainToInstance(ClientResponseDto, client, { excludeExtraneousValues: true });
  }

  @Patch(':id')
  async update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateClientDto,
  ): Promise<ClientResponseDto> {
    const client = await this.clientService.update(id, dto);
    return plainToInstance(ClientResponseDto, client, { excludeExtraneousValues: true });
  }

  @Post(':id/rotate-secret')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Rotate secret — new secret shown once, old immediately invalid' })
  async rotateSecret(@Param('id', ParseUUIDPipe) id: string): Promise<ClientCreatedResponseDto> {
    const { client, rawSecret } = await this.clientService.rotateSecret(id);
    return plainToInstance(
      ClientCreatedResponseDto,
      { ...client, clientSecret: rawSecret },
      { excludeExtraneousValues: true },
    );
  }

  @Patch(':id/suspend')
  @ApiOperation({ summary: 'Suspend client — blocks all token issuance immediately' })
  async suspend(@Param('id', ParseUUIDPipe) id: string): Promise<ClientResponseDto> {
    const client = await this.clientService.setActive(id, false);
    return plainToInstance(ClientResponseDto, client, { excludeExtraneousValues: true });
  }

  @Patch(':id/activate')
  async activate(@Param('id', ParseUUIDPipe) id: string): Promise<ClientResponseDto> {
    const client = await this.clientService.setActive(id, true);
    return plainToInstance(ClientResponseDto, client, { excludeExtraneousValues: true });
  }
}
```

---

## Client Module

```typescript
// client/client.module.ts
import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Client } from './entities/client.entity';
import { ClientRepository } from './client.repository';
import { ClientService } from './client.service';
import { ClientController } from './client.controller';

@Module({
  imports: [TypeOrmModule.forFeature([Client])],
  controllers: [ClientController],
  providers: [ClientRepository, ClientService],
  exports: [ClientService, ClientRepository], // AuthModule imports ClientModule
})
export class ClientModule {}
```

---

## Auth DTOs

```typescript
// auth/dto/token-request.dto.ts
import { IsString } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class TokenRequestDto {
  @ApiProperty({ example: 'xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx' })
  @IsString()
  clientId!: string;

  @ApiProperty({ example: 'abc123...64hexchars' })
  @IsString()
  clientSecret!: string;

  @ApiProperty({ example: 'client_credentials', enum: ['client_credentials'] })
  @IsString()
  grant_type!: string;
}
```

```typescript
// auth/dto/token-response.dto.ts
export class TokenResponseDto {
  access_token!: string;
  token_type!: 'Bearer';
  expires_in!: number; // seconds
}
```

---

## JWT Strategy

```typescript
// auth/strategies/jwt.strategy.ts
import { Injectable, UnauthorizedException } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { ConfigService } from '@nestjs/config';
import { ClientRepository } from '../../client/client.repository';
import { Client } from '../../client/entities/client.entity';

export interface JwtPayload {
  sub: string;       // clientId (UUID)
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
      secretOrKey: config.getOrThrow<string>('auth.jwtSecret'),
    });
  }

  // Called after signature + expiry are verified by passport-jwt
  // Re-fetches Client to catch suspension that happened after token was issued
  async validate(payload: JwtPayload): Promise<Client> {
    const client = await this.clientRepo.findByClientId(payload.sub);
    if (!client || !client.isActive) {
      throw new UnauthorizedException('Client is inactive or does not exist');
    }
    return client; // becomes request.user
  }
}
```

---

## Auth Service

```typescript
// auth/auth.service.ts
import { BadRequestException, Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { ClientService } from '../client/client.service';
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
      throw new BadRequestException('unsupported_grant_type');
    }

    // verifySecret() returns null for wrong secret AND for inactive clients
    // — no distinction to prevent information leakage
    const client = await this.clientService.verifySecret(dto.clientId, dto.clientSecret);
    if (!client) {
      throw new UnauthorizedException('invalid_client');
    }

    const expiresIn = this.config.get<number>('auth.accessTokenTtl', 3600);

    const payload: JwtPayload = {
      sub: client.clientId,
      slug: client.slug,
      scopes: client.scopes ?? [],
    };

    const access_token = await this.jwtService.signAsync(payload, { expiresIn });

    return { access_token, token_type: 'Bearer', expires_in: expiresIn };
  }
}
```

---

## Auth Controller

```typescript
// auth/auth.controller.ts
import { Body, Controller, HttpCode, HttpStatus, Post } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { AuthService } from './auth.service';
import { TokenRequestDto } from './dto/token-request.dto';
import { TokenResponseDto } from './dto/token-response.dto';
import { Public } from './guards/public.decorator';

@ApiTags('Auth')
@Controller('auth')
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
```

---

## Global Guard + @Public() Decorator

```typescript
// auth/guards/public.decorator.ts
import { SetMetadata } from '@nestjs/common';
export const IS_PUBLIC_KEY = 'isPublic';
export const Public = () => SetMetadata(IS_PUBLIC_KEY, true);
```

```typescript
// auth/guards/client-auth.guard.ts
import { ExecutionContext, Injectable } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { AuthGuard } from '@nestjs/passport';
import { IS_PUBLIC_KEY } from './public.decorator';

@Injectable()
export class ClientAuthGuard extends AuthGuard('jwt') {
  constructor(private readonly reflector: Reflector) {
    super();
  }

  canActivate(context: ExecutionContext) {
    const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);
    if (isPublic) return true;
    return super.canActivate(context);
  }
}
```

---

## Auth Module

```typescript
// auth/auth.module.ts
import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { PassportModule } from '@nestjs/passport';
import { ConfigService } from '@nestjs/config';
import { ClientModule } from '../client/client.module';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';
import { JwtStrategy } from './strategies/jwt.strategy';

@Module({
  imports: [
    ClientModule, // provides ClientService + ClientRepository
    PassportModule.register({ defaultStrategy: 'jwt' }),
    JwtModule.registerAsync({
      inject: [ConfigService],
      useFactory: (config: ConfigService) => ({
        secret: config.getOrThrow<string>('auth.jwtSecret'),
        // No global signOptions.expiresIn — set per signAsync call in AuthService
      }),
    }),
  ],
  controllers: [AuthController],
  providers: [AuthService, JwtStrategy],
  exports: [AuthService],
})
export class AuthModule {}
```

---

## Wire into AppModule

```typescript
// app.module.ts
import { APP_GUARD } from '@nestjs/core';
import { ClientAuthGuard } from './modules/auth/guards/client-auth.guard';
import { AuthModule } from './modules/auth/auth.module';
import { ClientModule } from './modules/client/client.module';

@Module({
  imports: [
    AuthModule,
    ClientModule,
    // ... other modules
  ],
  providers: [
    {
      provide: APP_GUARD,
      useClass: ClientAuthGuard, // every route protected by default
    },
  ],
})
export class AppModule {}
```

---

## @CurrentClient() Decorator

```typescript
// common/decorators/current-client.decorator.ts
import { createParamDecorator, ExecutionContext } from '@nestjs/common';
import { Client } from '../../modules/client/entities/client.entity';

export const CurrentClient = createParamDecorator(
  (_: unknown, ctx: ExecutionContext): Client => {
    return ctx.switchToHttp().getRequest().user;
  },
);

// Usage in any protected controller:
// @Get('assessments')
// findAll(@CurrentClient() client: Client) {
//   return this.assessmentService.findAll(client.clientId);
// }
```

---

## Config Keys Required

```typescript
// config/configuration.ts — add:
auth: {
  jwtSecret:      process.env.JWT_SECRET,        // min 32 chars, random
  accessTokenTtl: parseInt(process.env.ACCESS_TOKEN_TTL ?? '3600', 10), // seconds
},
```

```
# .env
JWT_SECRET=change-me-to-32-plus-random-chars
ACCESS_TOKEN_TTL=3600
```

---

## Request Flow Summary

```
POST /auth/token
  │
  ├─ ValidationPipe       — validates DTO shape
  ├─ ClientAuthGuard      — @Public() → skips JWT check
  ├─ AuthService.token()
  │     ├─ grant_type check
  │     ├─ ClientService.verifySecret()
  │     │     ├─ ClientRepository.findByClientId()
  │     │     ├─ isActive check
  │     │     └─ argon2id.verify(hash, rawSecret)
  │     └─ JwtService.signAsync({ sub, slug, scopes })
  └─ { access_token, token_type, expires_in }

GET /any-protected-route
  Authorization: Bearer <token>
  │
  ├─ ClientAuthGuard      — not @Public() → runs AuthGuard('jwt')
  ├─ JwtStrategy.validate()
  │     ├─ passport-jwt verifies signature + expiry
  │     ├─ ClientRepository.findByClientId(payload.sub)
  │     └─ isActive re-check (catches post-issue suspension)
  └─ request.user = Client entity
```

---

## ⚠️ Gotchas

- **`POST /auth/token` must be `@Public()`** — otherwise the global guard rejects it before the body is read.
- **`verifySecret()` returns `null` for both wrong secret and inactive client** — never distinguish between the two in error messages. `UnauthorizedException('invalid_client')` covers both.
- **`JwtStrategy.validate()` re-fetches the Client** — this is intentional. It catches clients suspended after a token was issued without waiting for token expiry.
- **No `signOptions.expiresIn` in `JwtModule.registerAsync`** — set it per `signAsync` call. Putting it in the module config makes it hard to vary per grant type later.
- **`ClientCreatedResponseDto.clientSecret` is shown exactly once** — at creation and rotation. Your API docs must say this explicitly. There is no recovery endpoint; rotation is the only option.
- **`ClientController` has no scope guard yet** — add `@RequireScope('clients:manage')` once super admin is implemented. Currently any valid Bearer token can call it.
- **Rate-limit `POST /auth/token`** — argon2id is slow by design but a flood of requests still wastes CPU. Add `@nestjs/throttler` on this endpoint.
- **`AsyncLocalStorage` client context** — populate it from `request.user.clientId` inside a middleware that runs *after* the guard, not from the request body.