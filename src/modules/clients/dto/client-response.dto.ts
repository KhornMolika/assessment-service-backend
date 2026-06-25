import { Expose, Exclude } from 'class-transformer';
import { ApiProperty } from '@nestjs/swagger';

// Base response — clientSecretHash is never exposed (not decorated with @Expose)
@Exclude()
export class ClientResponseDto {
  @Expose() @ApiProperty({ example: '123e4567-e89b-12d3-a456-426614174000', description: 'Internal UUID of the client' }) id!: string;
  @Expose() @ApiProperty({ example: 'client_abc123', description: 'Public facing client ID' }) clientId!: string;
  @Expose() @ApiProperty({ example: 'Acme Corp', description: 'Client display name' }) name!: string;
  @Expose() @ApiProperty({ example: 'acme-corp', description: 'Unique slug for the client' }) slug!: string;
  @Expose() @ApiProperty({ example: true, description: 'Whether the client is currently active' }) isActive!: boolean;
  @Expose() @ApiProperty({ example: ['assessments:read'], description: 'List of authorized scopes' }) scopes!: string[];
  @Expose() @ApiProperty({ example: ['https://acme.com'], description: 'List of allowed origins for CORS' }) allowedOrigins!: string[];
  @Expose() @ApiProperty({ example: 'https://acme.com/webhook', description: 'Webhook URL for events', nullable: true }) webhookUrl!: string | null;
  @Expose() @ApiProperty({ example: '2023-01-01T00:00:00Z', description: 'Timestamp when the client was created' }) createdAt!: Date;
}

// Returned ONCE at creation and at secret rotation — never again
export class ClientCreatedResponseDto extends ClientResponseDto {
  @Expose()
  @ApiProperty({ example: 'sec_xyz789', description: 'Raw secret — shown once, store securely' })
  clientSecret!: string;
}
