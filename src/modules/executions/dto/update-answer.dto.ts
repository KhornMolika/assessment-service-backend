import { IsOptional } from 'class-validator';

export class UpdateAnswerDto {
  @IsOptional()
  answer?: any;
}
