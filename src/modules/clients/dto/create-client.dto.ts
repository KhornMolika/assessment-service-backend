import {
  IsString,
  IsArray,
  IsOptional,
  IsUrl,
  ArrayUnique,
  IsNotEmpty,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateClientDto {
  @ApiProperty({
    example: 'Acme E-Learning Platform',
    description: 'Display name of the client',
  })
  @IsString()
  @IsNotEmpty()
  name!: string;

  @ApiProperty({
    example: 'acme-elearning',
    description: 'Unique slug for the client',
  })
  @IsString()
  @IsNotEmpty()
  slug!: string;

  @ApiPropertyOptional({
    example: ['https://acme.com'],
    description: 'Allowed origin URLs for CORS',
  })
  @IsArray()
  @IsUrl(
    {
      require_tld: false,
    },
    { each: true },
  )
  @ArrayUnique()
  @IsOptional()
  allowedOrigins?: string[];

  @ApiPropertyOptional({
    example: ['assessments:read', 'assessments:write'],
    description: 'OAuth scopes granted to the client',
  })
  @IsArray()
  @IsString({ each: true })
  @ArrayUnique()
  @IsOptional()
  scopes?: string[];

  @ApiPropertyOptional({
    example: 'https://acme.com/webhook',
    description: 'Webhook URL for receiving events',
  })
  @IsUrl()
  @IsOptional()
  webhookUrl?: string;

  @ApiPropertyOptional({
    example: 'my-secret',
    description: 'Secret used to sign webhook payloads',
  })
  @IsString()
  @IsOptional()
  webhookSecret?: string;
}
