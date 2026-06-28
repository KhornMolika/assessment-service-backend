import { ArrayMinSize, IsArray, IsUUID } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class ReplaceAssessmentQuestionsDto {
  @ApiProperty({
    example: [
      '123e4567-e89b-12d3-a456-426614174000',
      '123e4567-e89b-12d3-a456-426614174001',
    ],
    description: 'Array of question UUIDs',
  })
  @IsArray()
  @IsUUID('all', { each: true })
  @ArrayMinSize(1)
  questionIds!: string[];
}
