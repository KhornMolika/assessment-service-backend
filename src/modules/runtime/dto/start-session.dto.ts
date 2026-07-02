import { IsUUID, IsOptional } from 'class-validator';

export class StartSessionDto {
  @IsUUID()
  assessmentId!: string;

  @IsUUID()
  @IsOptional()
  participantId?: string;
}
