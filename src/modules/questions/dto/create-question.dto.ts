import {
  IsString,
  IsEnum,
  IsOptional,
  IsNumber,
  IsPositive,
} from 'class-validator';
import { Difficulty } from '../entities/question.entity';
import { QuestionTypeName } from '../constants/question-types.config';

export class CreateQuestionDto {
  @IsEnum(QuestionTypeName)
  type!: QuestionTypeName;

  @IsString()
  questionText!: string;

  @IsEnum(Difficulty)
  difficulty!: Difficulty;

  @IsNumber()
  @IsPositive()
  points!: number;

  @IsOptional()
  options?: string | string[] | Record<string, unknown>[];

  @IsOptional()
  correctAnswers?: string | string[] | Record<string, unknown>[];
}
