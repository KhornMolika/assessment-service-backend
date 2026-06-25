// -----------------------------------------------------------------------------
// points overrides question.defaultPoints for this assessment only.
// -----------------------------------------------------------------------------
import { IsUUID, IsOptional, IsNumber, Min } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class AddAssessmentQuestionDto {
  @ApiProperty({ example: '123e4567-e89b-12d3-a456-426614174000', description: 'The UUID of the question' })
  @IsUUID()
  questionId!: string;

  @ApiProperty({ example: 10, description: 'Points for this question in this assessment (overrides defaultPoints)', minimum: 0, required: false })
  @IsNumber()
  @Min(0)
  @IsOptional()
  points?: number;
}
