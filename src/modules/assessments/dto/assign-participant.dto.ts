// -----------------------------------------------------------------------------
// Body varies by assessment's participantIdentity setting:
//   AUTHENTICATED: name + email (client platform verified)
//   EXTERNAL:      name + email (invited person)
//   ANONYMOUS:     nothing — rejected here, handled at session start
// -----------------------------------------------------------------------------
import { IsString, IsEmail, IsOptional, IsNotEmpty } from 'class-validator';

export class AssignParticipantDto {
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
