import { IsString, IsNotEmpty, IsOptional, IsUUID } from 'class-validator';

export class SubmitAnswerDto {
  @IsString()
  @IsNotEmpty()
  roomId!: string; // assessmentId

  @IsUUID()
  assessmentQuestionId!: string;

  @IsString()
  @IsOptional()
  choice?: string; // optionId for SINGLE_CHOICE, TRUE_FALSE

  @IsOptional()
  response?: Record<string, any>; // for ORDERING, MATCHING, FILL_IN_BLANK

  @IsOptional()
  timeTaken?: number; // milliseconds
}
