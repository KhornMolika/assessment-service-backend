// -----------------------------------------------------------------------------
// Random pull from a bank — MANUAL mode only.
// -----------------------------------------------------------------------------
import { IsUUID, IsInt, IsEnum, IsOptional, Min, Max } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
import { Difficulty } from '../../questions/entities/question.entity';

export class GenerateQuestionsDto {
  @ApiProperty({
    example: '123e4567-e89b-12d3-a456-426614174000',
    description: 'The UUID of the question bank',
  })
  @IsUUID()
  bankId!: string;

  @ApiProperty({
    example: 10,
    description: 'The number of questions to generate',
    minimum: 1,
    maximum: 100,
  })
  @IsInt()
  @Min(1)
  @Max(100)
  count!: number;

  @ApiProperty({
    example: Difficulty.MEDIUM,
    enum: Difficulty,
    description: 'The difficulty level of the questions',
    required: false,
  })
  @IsEnum(Difficulty)
  @IsOptional()
  difficulty?: Difficulty;
}
