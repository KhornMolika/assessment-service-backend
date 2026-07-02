import { IsArray, IsOptional, IsUrl, ArrayUnique } from 'class-validator';

// Deliberately narrow — clients cannot change slug or scopes
export class UpdateMeDto {
  @IsArray()
  @IsUrl({}, { each: true })
  @ArrayUnique()
  @IsOptional()
  allowedOrigins?: string[];

  @IsUrl()
  @IsOptional()
  webhookUrl?: string;
}
