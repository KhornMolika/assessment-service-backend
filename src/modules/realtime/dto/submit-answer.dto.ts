import { IsString, IsOptional, IsNumber, IsObject } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class SubmitAnswerDto {
  @ApiProperty({
    example: '123e4567-e89b-12d3-a456-426614174000',
    description: 'The ID of the room',
    required: false,
  })
  @IsString()
  @IsOptional()
  roomId?: string;

  @ApiProperty({
    example: 'A',
    description: 'The choice selected by the user',
    required: false,
  })
  @IsString()
  @IsOptional()
  choice?: string;

  @ApiProperty({
    example: { selectedOptions: ['A', 'B'] },
    description: 'The response for complex question types',
    required: false,
  })
  @IsObject()
  @IsOptional()
  response?: Record<string, any>; // for complex question types

  @ApiProperty({
    example: 120,
    description: 'The time taken to answer in seconds',
    required: false,
  })
  @IsNumber()
  @IsOptional()
  timeTaken?: number;
}
