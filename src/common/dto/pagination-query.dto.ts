import {
  IsOptional,
  IsString,
  IsPositive,
  Max,
  IsIn,
  IsEnum,
  IsUUID,
} from 'class-validator';
import { Type } from 'class-transformer';
import { BankVisibility } from '../../modules/question-banks/question-bank.entity';

export class PaginationQueryDto {
  @IsOptional()
  @Type(() => Number)
  @IsPositive()
  page: number = 1; // Default to page 1

  @IsOptional()
  @Type(() => Number)
  @IsPositive()
  @Max(100)
  limit: number = 10; // Default to 10 records per page

  @IsOptional()
  @IsString()
  search?: string;

  @IsOptional()
  @IsIn(['createdAt', 'name', 'updatedAt'])
  sortBy: string = 'createdAt';

  @IsOptional()
  @IsIn(['ASC', 'DESC', 'asc', 'desc'])
  order: 'ASC' | 'DESC' | 'asc' | 'desc' = 'DESC';

  @IsOptional()
  @IsEnum(BankVisibility)
  visibility?: BankVisibility;

  @IsOptional()
  @IsString()
  tag?: string;

  @IsOptional()
  @IsUUID('4')
  topicId?: string;
}
