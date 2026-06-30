import { ApiProperty } from '@nestjs/swagger';

export class TokenResponseDto {
  @ApiProperty({
    example: 'eyJhbGciOiJIUzI1...',
    description:
      'The access token string as issued by the authorization server',
  })
  access_token!: string;

  @ApiProperty({
    example: 'Bearer',
    description: 'The type of the token issued',
  })
  token_type!: 'Bearer';

  @ApiProperty({
    example: 3600,
    description: 'The lifetime in seconds of the access token',
  })
  expires_in!: number; // seconds
}
