import { IsString, IsUUID } from 'class-validator';

export class TokenRequestDto {
  @IsUUID()
  clientId!: string;

  @IsString()
  clientSecret!: string;

  @IsString()
  grant_type!: string;
}
