// -----------------------------------------------------------------------------
// Payload to create a new assessment under a topic.
// -----------------------------------------------------------------------------
import {
  IsEnum,
  IsNotEmpty,
  IsOptional,
  IsString,
  MaxLength,
} from 'class-validator';

import { AssessmentType } from '../entities/assessment.entity';

export class CreateAssessmentDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(512)
  name!: string;

  @IsEnum(AssessmentType)
  type!: AssessmentType;

  @IsString()
  @IsOptional()
  description?: string;
}
