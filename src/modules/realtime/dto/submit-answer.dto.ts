import { IsString, IsOptional, IsNumber, IsObject } from 'class-validator';

export class SubmitAnswerDto {
  @IsString()
  @IsOptional()
  choice?: string;

  @IsObject()
  @IsOptional()
  response?: Record<string, any>; // for complex question types

  @IsNumber()
  @IsOptional()
  timeTaken?: number;
}
