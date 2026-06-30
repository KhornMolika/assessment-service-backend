import { IsOptional, IsString, Length, MaxLength } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateTopicDto {
  @ApiProperty({
    example: 'Mathematics',
    description: 'Name of the topic',
    minLength: 3,
    maxLength: 256,
  })
  @IsString({ message: 'name must be a string' })
  @Length(3, 256)
  name!: string;

  @ApiPropertyOptional({
    example: 'General mathematics including algebra and geometry',
    description: 'Detailed description of the topic',
    maxLength: 500,
  })
  @IsOptional()
  @IsString()
  @MaxLength(500)
  description?: string;
}
