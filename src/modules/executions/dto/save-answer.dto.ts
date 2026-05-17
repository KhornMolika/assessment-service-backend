import { IsString, IsNotEmpty, IsOptional } from 'class-validator';

export class SaveAnswerDto {
  @IsNotEmpty()
  @IsString()
  questionId!: string;

  @IsOptional()
  answer?: any;
}
