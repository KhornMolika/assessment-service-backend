import { IsArray, IsOptional, IsUrl, ArrayUnique } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';

// Deliberately narrow — clients cannot change slug or scopes
export class UpdateMeDto {
  @ApiPropertyOptional({ example: ['https://acme.com'] })
  @IsArray()
  @IsUrl({}, { each: true })
  @ArrayUnique()
  @IsOptional()
  allowedOrigins?: string[];

  @ApiPropertyOptional()
  @IsUrl()
  @IsOptional()
  webhookUrl?: string;
}
