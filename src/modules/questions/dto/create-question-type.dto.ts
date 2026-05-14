import {
  IsString,
  IsEnum,
  IsBoolean,
  IsInt,
  IsOptional,
  Min,
  MaxLength,
} from 'class-validator';
import { GradingStrategy } from '../entities/question-type.entity';

export class CreateQuestionTypeDto {
  @IsString()
  @MaxLength(50)
  name!: string;

  @IsEnum(GradingStrategy)
  gradingStrategy!: GradingStrategy;

  @IsOptional()
  @IsBoolean()
  hasOptions?: boolean;

  @IsOptional()
  @IsBoolean()
  supportsAi?: boolean;

  @IsOptional()
  @IsBoolean()
  isManualOnly?: boolean;

  @IsOptional()
  @IsInt()
  @Min(0)
  defaultMaxScore?: number;

  @IsOptional()
  @IsString()
  description?: string;
}
