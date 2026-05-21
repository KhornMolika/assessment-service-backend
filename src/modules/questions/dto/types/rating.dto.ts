import { IsInt, IsString, IsOptional, Min, Max } from 'class-validator';

export class RatingOptionsDto {
  @IsInt()
  @Min(1)
  min: number = 1;

  @IsInt()
  @Max(10)
  max: number = 5;

  @IsOptional()
  @IsString()
  lowLabel?: string;

  @IsOptional()
  @IsString()
  highLabel?: string;
}