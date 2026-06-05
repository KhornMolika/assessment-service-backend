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
  @ApiProperty({ example: 'Acme E-Learning Platform' })
  @IsString()
  @IsNotEmpty()
  name!: string;

  @ApiProperty({ example: 'acme-elearning' })
  @IsString()
  @IsNotEmpty()
  slug!: string;

  @ApiPropertyOptional({ example: ['https://acme.com'] })
  @IsArray()
  @IsUrl({}, { each: true })
  @ArrayUnique()
  @IsOptional()
  allowedOrigins?: string[];

  @ApiPropertyOptional({ example: ['assessments:read', 'assessments:write'] })
  @IsArray()
  @IsString({ each: true })
  @ArrayUnique()
  @IsOptional()
  scopes?: string[];

  @ApiPropertyOptional()
  @IsUrl()
  @IsOptional()
  webhookUrl?: string;

  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  webhookSecret?: string;
}
