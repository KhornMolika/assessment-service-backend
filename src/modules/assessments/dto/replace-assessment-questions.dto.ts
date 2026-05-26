import { ArrayMinSize, IsArray, IsUUID } from 'class-validator';

export class ReplaceAssessmentQuestionsDto {
  @IsArray()
  @IsUUID('all', { each: true })
  @ArrayMinSize(1)
  questionIds!: string[];
}
