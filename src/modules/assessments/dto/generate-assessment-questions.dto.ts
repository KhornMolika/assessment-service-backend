import { IsString, IsNumber, IsOptional, IsNotEmpty } from 'class-validator';

export class GenerateAssessmentQuestionsDto {
  @IsNotEmpty()
  @IsString()
  bankId!: string;

  @IsNotEmpty()
  @IsNumber()
  count!: number;

  @IsOptional()
  @IsString()
  difficulty?: string;
}
