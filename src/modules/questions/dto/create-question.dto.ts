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

export class CreateQuestionDto {
  @IsUUID('4')
  bankId!: string;

  @IsUUID('4')
  typeId!: string;

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
  settings!: any;

  @IsObject()
  correctAnswer!: any;

  @IsOptional()
  @IsArray()
  @IsUUID('4', { each: true })
  topicIds?: string[];
}
