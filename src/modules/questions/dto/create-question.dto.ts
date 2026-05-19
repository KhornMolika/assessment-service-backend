import {
  IsString,
  IsEnum,
  IsOptional,
  IsArray,
  IsNumber,
  IsPositive,
} from 'class-validator';
import { Difficulty } from '../entities/question.entity';
import { QuestionTypeName } from '../constants/question-types.config';

export class CreateQuestionDto {
  @IsEnum(QuestionTypeName)
  type!: QuestionTypeName;

  @IsString()
  text!: string;

  @IsEnum(Difficulty)
  difficulty!: Difficulty;

  @IsNumber()
  @IsPositive()
  points!: number;

  @IsOptional()
  options?: string | string[] | Record<string, any>[];

  @IsOptional()
  correctAnswers?: string | string[] | Record<string, any>[];
}
