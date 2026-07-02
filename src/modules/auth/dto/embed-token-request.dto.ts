import { IsString, IsUUID, IsOptional } from 'class-validator';

export class EmbedTokenRequestDto {
  @IsUUID()
  clientId!: string;

  @IsString()
  clientSecret!: string;

  @IsString()
  origin!: string;

  @IsOptional()
  @IsString()
  participantId?: string;

  @IsOptional()
  @IsString()
  participantName?: string;
}
