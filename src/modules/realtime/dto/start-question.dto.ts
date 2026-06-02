import { IsOptional, IsString } from 'class-validator';

export class StartQuestionDto {
  @IsString()
  @IsOptional()
  questionId?: string; // if omitted, server advances to next
}
