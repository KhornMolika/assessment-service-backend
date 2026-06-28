import { IsInt, IsString, IsOptional, Min, Max } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class RatingOptionsDto {
  @ApiProperty({ example: 1, description: 'Minimum rating value', minimum: 1 })
  @IsInt()
  @Min(1)
  min: number = 1;

  @ApiProperty({ example: 5, description: 'Maximum rating value', maximum: 10 })
  @IsInt()
  @Max(10)
  max: number = 5;

  @ApiPropertyOptional({
    example: 'Poor',
    description: 'Label for the lowest rating',
  })
  @IsOptional()
  @IsString()
  lowLabel?: string;

  @ApiPropertyOptional({
    example: 'Excellent',
    description: 'Label for the highest rating',
  })
  @IsOptional()
  @IsString()
  highLabel?: string;
}
