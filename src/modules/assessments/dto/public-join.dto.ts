import { IsString, IsEmail, IsOptional, IsNotEmpty } from 'class-validator';

export class PublicJoinDto {
  @IsString()
  @IsNotEmpty()
  @IsOptional()
  name?: string;

  @IsEmail()
  @IsOptional()
  email?: string;

  @IsString()
  @IsOptional()
  phone?: string;
}
