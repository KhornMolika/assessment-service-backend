import {
  IsString,
  Length,
  IsOptional,
  IsArray,
  IsEnum,
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  IsUUID,
} from 'class-validator';
import { BankVisibility } from '../entities/question-bank.entity';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateQuestionBankDto {
  @ApiProperty({
    example: 'JavaScript Basics',
    description: 'Name of the question bank',
    minLength: 3,
    maxLength: 256,
  })
  @IsString()
  @Length(3, 256)
  name!: string;

  @ApiPropertyOptional({
    example: 'A collection of basic JavaScript questions.',
    description: 'Description of the bank',
  })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiPropertyOptional({
    example: ['js', 'programming', 'basics'],
    description: 'Tags to categorize the question bank',
  })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  tags?: string[];

  @ApiPropertyOptional({
    enum: BankVisibility,
    example: BankVisibility.PRIVATE,
    description: 'Visibility setting of the bank',
  })
  @IsOptional()
  @IsEnum(BankVisibility)
  visibility?: BankVisibility;
}
