// -----------------------------------------------------------------------------
// Random pull from a bank — MANUAL mode only.
// -----------------------------------------------------------------------------
import { IsUUID, IsInt, IsEnum, IsOptional, Min, Max } from 'class-validator';

import { Difficulty } from '../../questions/entities/question.entity';

export class GenerateQuestionsDto {
  @IsUUID()
  bankId!: string;

  @IsInt()
  @Min(1)
  @Max(100)
  count!: number;

  @IsEnum(Difficulty)
  @IsOptional()
  difficulty?: Difficulty;
}
