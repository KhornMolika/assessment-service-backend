import { IsArray, IsOptional, IsUrl, ArrayUnique } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';

// Deliberately narrow — clients cannot change slug or scopes
export class UpdateMeDto {
  @ApiPropertyOptional({
    example: ['https://acme.com'],
    description: 'Allowed origin URLs for CORS',
  })
  @IsArray()
  @IsUrl({}, { each: true })
  @ArrayUnique()
  @IsOptional()
  allowedOrigins?: string[];

  @ApiPropertyOptional({
    example: 'https://acme.com/webhook',
    description: 'Webhook URL for receiving events',
  })
  @IsUrl()
  @IsOptional()
  webhookUrl?: string;
}
