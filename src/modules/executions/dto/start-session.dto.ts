import { IsString, IsNotEmpty } from 'class-validator';

export class StartSessionDto {
  @IsNotEmpty()
  @IsString()
  assessmentId!: string;

  @IsNotEmpty()
  @IsString()
  participantId!: string;
}
