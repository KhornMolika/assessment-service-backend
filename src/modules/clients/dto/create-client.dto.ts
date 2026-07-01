import {
  IsString,
  IsArray,
  IsOptional,
  IsUrl,
  ArrayUnique,
  IsNotEmpty,
} from 'class-validator';

export class CreateClientDto {
  @IsString()
  @IsNotEmpty()
  name!: string;

  @IsString()
  @IsNotEmpty()
  slug!: string;

  @IsArray()
  @IsUrl({}, { each: true })
  @ArrayUnique()
  @IsOptional()
  allowedOrigins?: string[];

  @IsArray()
  @IsString({ each: true })
  @ArrayUnique()
  @IsOptional()
  scopes?: string[];

  @IsUrl()
  @IsOptional()
  webhookUrl?: string;

  @IsString()
  @IsOptional()
  webhookSecret?: string;
}
