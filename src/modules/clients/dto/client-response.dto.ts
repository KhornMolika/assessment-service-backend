import { Expose, Exclude } from 'class-transformer';

// Base response — clientSecretHash is never exposed (not decorated with @Expose)
@Exclude()
export class ClientResponseDto {
  @Expose()
  id!: string;
  @Expose()
  clientId!: string;
  @Expose()
  name!: string;
  @Expose()
  slug!: string;
  @Expose()
  isActive!: boolean;
  @Expose()
  scopes!: string[];
  @Expose()
  allowedOrigins!: string[];
  @Expose()
  webhookUrl!: string | null;
  @Expose()
  createdAt!: Date;
}

// Returned ONCE at creation and at secret rotation — never again
export class ClientCreatedResponseDto extends ClientResponseDto {
  @Expose()
  clientSecret!: string;
}
