export class TokenResponseDto {
  access_token!: string;

  token_type!: 'Bearer';

  expires_in!: number; // seconds
}
