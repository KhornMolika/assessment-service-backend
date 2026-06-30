// -----------------------------------------------------------------------------
// Body varies by assessment's participantIdentity setting:
//   AUTHENTICATED: name + email (client platform verified)
//   EXTERNAL:      name + email (invited person)
//   ANONYMOUS:     nothing — rejected here, handled at session start
// -----------------------------------------------------------------------------
import { IsString, IsEmail, IsOptional, IsNotEmpty } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class AssignParticipantDto {
  @ApiProperty({
    example: 'John Doe',
    description: 'The full name of the participant',
    required: false,
  })
  @IsString()
  @IsNotEmpty()
  @IsOptional()
  name?: string;

  @ApiProperty({
    example: 'john.doe@example.com',
    description: 'The email address of the participant',
    required: false,
  })
  @IsEmail()
  @IsOptional()
  email?: string;

  @ApiProperty({
    example: '+1234567890',
    description: 'The phone number of the participant',
    required: false,
  })
  @IsString()
  @IsOptional()
  phone?: string;
}
