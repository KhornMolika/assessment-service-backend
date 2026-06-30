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
import { ApiProperty } from '@nestjs/swagger';
import { AssessmentType } from '../entities/assessment.entity';

export class CreateAssessmentDto {
  @ApiProperty({
    example: 'Midterm Exam',
    description: 'The name of the assessment',
  })
  @IsString()
  @IsNotEmpty()
  @MaxLength(512)
  name!: string;

  @ApiProperty({
    example: AssessmentType.EXAM,
    enum: AssessmentType,
    description: 'The type of the assessment',
  })
  @IsEnum(AssessmentType)
  type!: AssessmentType;

  @ApiProperty({
    example: 'This is a midterm exam for the course.',
    description: 'The description of the assessment',
    required: false,
  })
  @IsString()
  @IsOptional()
  description?: string;
}
