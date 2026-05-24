// -----------------------------------------------------------------------------
// A single grade label entry — name is the label (A, B, Pass),
// min is the minimum score percentage to qualify.
// -----------------------------------------------------------------------------
import { IsString, IsInt, Min, Max } from 'class-validator';

export class GradeLabelDto {
  @IsString()
  name!: string;

  @IsInt()
  @Min(0)
  @Max(100)
  min!: number;
}