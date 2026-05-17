import {
  IsString,
  IsEnum,
  IsOptional,
  IsArray,
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

  @IsOptional()
  @IsArray()
  options?: any[];

  @IsOptional()
  correct_answer?: string | string[] | Record<string, any>[] | null;
}
