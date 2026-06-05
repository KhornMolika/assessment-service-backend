import { IsString, IsOptional, IsNumber, IsObject } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class SubmitAnswerDto {
  @ApiProperty({ example: 'A', description: 'The choice selected by the user', required: false })
  @IsString()
  @IsOptional()
  choice?: string;

  @ApiProperty({ example: { selectedOptions: ['A', 'B'] }, description: 'The response for complex question types', required: false })
  @IsObject()
  @IsOptional()
  response?: Record<string, any>; // for complex question types

  @ApiProperty({ example: 120, description: 'The time taken to answer in seconds', required: false })
  @IsNumber()
  @IsOptional()
  timeTaken?: number;
}
