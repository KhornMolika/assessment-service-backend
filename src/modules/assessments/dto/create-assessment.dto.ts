import { IsString, IsOptional, IsNotEmpty } from 'class-validator';

export class CreateAssessmentDto {
  @IsNotEmpty()
  @IsString()
  name!: string;

  @IsOptional()
  @IsString()
  type?: string;

  @IsOptional()
  @IsString()
  description?: string;
}
