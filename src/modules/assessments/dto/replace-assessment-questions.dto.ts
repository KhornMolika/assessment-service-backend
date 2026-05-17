import { IsArray, IsString } from 'class-validator';

export class ReplaceAssessmentQuestionsDto {
  @IsArray()
  @IsString({ each: true })
  questionIds!: string[];
}
