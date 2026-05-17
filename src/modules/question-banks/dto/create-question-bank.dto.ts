import { IsString, Length, IsOptional, IsArray, IsEnum, IsUUID } from 'class-validator';
import { BankVisibility } from '../entities/question-bank.entity';

export class CreateQuestionBankDto {
  @IsString()
  @Length(3, 256)
  name!: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  tags?: string[];

  @IsOptional()
  @IsUUID('4')
  topicId?: string;

  @IsOptional()
  @IsEnum(BankVisibility)
  visibility?: BankVisibility;
}