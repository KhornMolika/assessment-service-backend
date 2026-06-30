import { IsUUID, IsNotEmpty } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class SaveAnswerDto {
  @ApiProperty({
    example: '123e4567-e89b-12d3-a456-426614174000',
    description: 'The ID of the assessment question',
  })
  @IsUUID()
  assessmentQuestionId!: string;

  @ApiProperty({
    example: { selectedOption: 'A' },
    description: 'The response given by the user',
  })
  @IsNotEmpty()
  response!: Record<string, unknown>;
}
