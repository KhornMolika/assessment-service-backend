import { IsOptional, IsDateString } from 'class-validator';

export class SubmitSessionDto {
  @IsOptional()
  @IsDateString()
  submittedAt?: string;
}
