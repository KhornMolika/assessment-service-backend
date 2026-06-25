// -----------------------------------------------------------------------------
// A single grade label entry — name is the label (A, B, Pass),
// min is the minimum score percentage to qualify.
// -----------------------------------------------------------------------------
import { IsString, IsInt, Min, Max } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class GradeLabelDto {
  @ApiProperty({ example: 'A', description: 'The label for the grade' })
  @IsString()
  name!: string;

  @ApiProperty({ example: 90, description: 'The minimum score percentage to qualify for this grade', minimum: 0, maximum: 100 })
  @IsInt()
  @Min(0)
  @Max(100)
  min!: number;
}
