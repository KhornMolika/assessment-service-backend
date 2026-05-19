import { IsString, IsNotEmpty } from 'class-validator';

export class AddAssessmentQuestionDto {
  @IsNotEmpty()
  @IsString()
  questionId!: string;
}
