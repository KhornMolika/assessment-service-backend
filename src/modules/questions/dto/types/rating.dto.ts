import { IsInt, IsString, IsOptional, Min, Max } from 'class-validator';

export class RatingSettingsDto {
  @IsInt()
  @Min(1)
  min: number = 1;

  @IsInt()
  @Max(10)
  max: number = 5;

  @IsOptional()
  @IsString()
  lowLabel?: string; // e.g., "Unsatisfied"

  @IsOptional()
  @IsString()
  highLabel?: string; // e.g., "Extremely Satisfied"
}

export class RatingAnswerDto {
  // Left completely empty because scaled rating values carry no direct correctness metrics
}