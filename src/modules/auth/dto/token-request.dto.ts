import { IsString, IsUUID } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class TokenRequestDto {
  @ApiProperty({ example: 'xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx' })
  @IsUUID()
  clientId!: string;

  @ApiProperty({ example: 'abc123...64hexchars' })
  @IsString()
  clientSecret!: string;

  @ApiProperty({ example: 'client_credentials', enum: ['client_credentials'] })
  @IsString()
  grant_type!: string;
}
