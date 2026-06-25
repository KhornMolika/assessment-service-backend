import { IsUUID, IsOptional, IsArray } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';

export class AddQuestionsToBankDto {
  @ApiPropertyOptional({ example: '123e4567-e89b-12d3-a456-426614174000', description: 'Single question UUID to add' })
  @IsOptional()
  @IsUUID()
  questionId?: string;

  @ApiPropertyOptional({ example: ['123e4567-e89b-12d3-a456-426614174000', '123e4567-e89b-12d3-a456-426614174001'], description: 'Array of question UUIDs to add' })
  @IsOptional()
  @IsArray()
  @IsUUID('all', { each: true })
  questionIds?: string[];
}
