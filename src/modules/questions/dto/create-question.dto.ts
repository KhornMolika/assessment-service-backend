import {
  IsString,
  IsEnum,
  IsOptional,
  IsNumber,
  IsPositive,
} from 'class-validator';
import { Difficulty } from '../entities/question.entity';
import { QuestionTypeName } from '../constants/question-types.config';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateQuestionDto {
  @ApiProperty({
    enum: QuestionTypeName,
    example: QuestionTypeName.MULTIPLE_CHOICE,
    description: 'Type of the question',
  })
  @IsEnum(QuestionTypeName)
  type!: QuestionTypeName;

  @ApiProperty({
    example: 'What is NestJS?',
    description: 'The text content of the question',
  })
  @IsString()
  questionText!: string;

  @ApiProperty({
    enum: Difficulty,
    example: Difficulty.EASY,
    description: 'Difficulty level of the question',
  })
  @IsEnum(Difficulty)
  difficulty!: Difficulty;

  @ApiProperty({
    example: 10,
    description: 'Points awarded for a correct answer',
    minimum: 1,
  })
  @IsNumber()
  @IsPositive()
  points!: number;

  @ApiPropertyOptional({
    example: { options: [{ id: 'opt_1', text: 'A Node.js framework' }] },
    description: 'Question specific options configuration',
  })
  @IsOptional()
  options?: string | string[] | Record<string, unknown>[];

  @ApiPropertyOptional({
    example: { optionIds: ['opt_1'] },
    description: 'Correct answer(s) for the question',
  })
  @IsOptional()
  correctAnswers?: string | string[] | Record<string, unknown>[];
}
