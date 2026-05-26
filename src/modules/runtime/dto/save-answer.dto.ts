import { IsUUID, IsNotEmpty } from 'class-validator';

export class SaveAnswerDto {
  @IsUUID()
  assessmentQuestionId!: string;

  @IsNotEmpty()
  response!: Record<string, any>;
}
