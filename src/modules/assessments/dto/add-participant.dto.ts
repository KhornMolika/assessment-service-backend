import { IsString, IsNotEmpty, IsOptional, IsEmail } from 'class-validator';

export class AddParticipantDto {
  @IsNotEmpty()
  @IsString()
  name!: string;

  @IsOptional()
  @IsEmail()
  email?: string;

  @IsOptional()
  @IsString()
  phone?: string;
}
