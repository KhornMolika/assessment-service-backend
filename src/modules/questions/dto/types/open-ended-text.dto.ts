import {
  IsInt,
  Min,
  Max,
  IsArray,
  IsString,
  IsNotEmpty,
} from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class OpenEndedTextOptionsDto {
  @ApiProperty({ example: 0, description: 'Minimum number of words expected', minimum: 0 })
  @IsInt()
  @Min(0)
  minWords: number = 0; // Set to 0 for short answers if word count isn't strictly enforced

  @ApiProperty({ example: 500, description: 'Maximum number of words allowed', maximum: 5000 })
  @IsInt()
  @Max(5000)
  maxWords!: number; // e.g., 50 for short answer, 1000 for essay
}

export class OpenEndedTextAnswerDto {
  @ApiProperty({ example: 'NestJS is a progressive Node.js framework for building efficient and scalable server-side applications.', description: 'Model or reference answer for grading or reference' })
  @IsString()
  @IsNotEmpty()
  modelAnswerReference!: string;

  @ApiProperty({ example: ['progressive', 'scalable', 'server-side'], description: 'List of key points expected in a correct answer' })
  @IsArray()
  @IsString({ each: true })
  @IsNotEmpty({ each: true })
  keyPointsExpected!: string[];
}
