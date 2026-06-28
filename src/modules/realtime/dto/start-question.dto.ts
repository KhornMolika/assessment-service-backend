import { IsOptional, IsString } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class StartQuestionDto {
  @ApiProperty({
    example: '123e4567-e89b-12d3-a456-426614174000',
    description: 'The ID of the room.',
    required: false,
  })
  @IsString()
  @IsOptional()
  roomId?: string;

  @ApiProperty({
    example: '123e4567-e89b-12d3-a456-426614174000',
    description:
      'The ID of the question. If omitted, the server advances to the next question.',
    required: false,
  })
  @IsString()
  @IsOptional()
  questionId?: string; // if omitted, server advances to next
}
