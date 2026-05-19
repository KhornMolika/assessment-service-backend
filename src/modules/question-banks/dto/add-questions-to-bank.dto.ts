import { IsUUID, IsOptional, IsArray } from 'class-validator';

export class AddQuestionsToBankDto {
  @IsOptional()
  @IsUUID()
  questionId?: string;

  @IsOptional()
  @IsArray()
  @IsUUID('all', { each: true })
  questionIds?: string[];
}
