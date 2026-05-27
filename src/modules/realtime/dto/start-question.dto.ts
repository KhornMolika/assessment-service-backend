import { IsString, IsNotEmpty, IsOptional, IsUUID } from 'class-validator';

export class StartQuestionDto {
  @IsString()
  @IsNotEmpty()
  roomId!: string; // assessmentId

  @IsUUID()
  @IsOptional()
  questionId?: string; // if omitted, server advances to next
}
