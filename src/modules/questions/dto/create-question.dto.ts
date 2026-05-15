import {
  IsString,
  IsEnum,
  IsInt,
  IsOptional,
  IsArray,
  IsUUID,
  IsObject,
  Min,
} from 'class-validator';
import { Difficulty } from '../entities/question.entity';
import { QuestionTypeName } from '../constants/question-types.config';

export class CreateQuestionDto {
  @IsUUID('4')
  bankId!: string;

  @IsEnum(QuestionTypeName)
  type!: QuestionTypeName;

  @IsString()
  questionText!: string;

  @IsEnum(Difficulty)
  difficulty!: Difficulty;

  @IsInt()
  @Min(0)
  points!: number;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  tags?: string[];

  @IsObject()
  settings!:  Record<string, any>;

  @IsObject()
  correctAnswer!: Record<string, any>; 

  @IsOptional()
  @IsArray()
  @IsUUID('4', { each: true })
  topicIds!: string[];
}
