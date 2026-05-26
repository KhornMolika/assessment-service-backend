// -----------------------------------------------------------------------------
// points overrides question.defaultPoints for this assessment only.
// -----------------------------------------------------------------------------
import { IsUUID, IsOptional, IsNumber, Min } from 'class-validator';

export class AddAssessmentQuestionDto {
  @IsUUID()
  questionId!: string;

  @IsNumber()
  @Min(0)
  @IsOptional()
  points?: number;
}
