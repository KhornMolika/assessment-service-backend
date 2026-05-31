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
  @Expose() @ApiProperty({ nullable: true }) webhookUrl!: string | null;
  @Expose() @ApiProperty() createdAt!: Date;
}

// Returned ONCE at creation and at secret rotation — never again
export class ClientCreatedResponseDto extends ClientResponseDto {
  @Expose() @ApiProperty({ description: 'Raw secret — shown once, store securely' })
  clientSecret!: string;
}
