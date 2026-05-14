import { IsString, Length, IsOptional, IsArray, IsEnum, IsUUID } from 'class-validator';
import { BankVisibility } from '../question-bank.entity';

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
  @IsArray()
  @IsUUID('4', { each: true }) // 👈 Enforces valid UUIDs for topics
  topicId?: string[];

  @IsOptional()
  @IsEnum(BankVisibility)
  visibility?: BankVisibility;
}