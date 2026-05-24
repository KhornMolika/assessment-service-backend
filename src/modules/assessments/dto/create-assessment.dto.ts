// -----------------------------------------------------------------------------
// Payload to create a new assessment under a topic.
// -----------------------------------------------------------------------------
import { IsEnum, IsNotEmpty, IsOptional, IsString } from 'class-validator';
import { AssessmentStatus, AssessmentType } from '../entities/assessment.entity';

export class CreateAssessmentDto {
  @IsString()
  @IsNotEmpty()
  name!: string;

  @IsEnum(AssessmentType)
  type!: AssessmentType;

  @IsString()
  @IsOptional()
  description?: string;

}
