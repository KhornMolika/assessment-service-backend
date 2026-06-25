import { IsString, IsUUID } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class TokenRequestDto {
  @ApiProperty({ example: 'xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx', description: 'The client ID' })
  @IsUUID()
  clientId!: string;

  @ApiProperty({ example: 'abc123...64hexchars', description: 'The client secret' })
  @IsString()
  clientSecret!: string;

  @ApiProperty({ example: 'client_credentials', enum: ['client_credentials'], description: 'The grant type' })
  @IsString()
  grant_type!: string;
}
