import { Transform, Type } from 'class-transformer';
import {
  IsBoolean,
  IsIn,
  IsOptional,
  IsPositive,
  IsString,
  Max,
} from 'class-validator';

export class QueryTopicDto {
  @IsOptional()
  @Type(() => Number)
  @IsPositive()
  page?: number;

  @IsOptional()
  @Type(() => Number)
  @IsPositive()
  @Max(100)
  limit?: number;

  @IsOptional()
  @IsString()
  search?: string;

  @IsOptional()
  @IsBoolean()
  @Transform(({ value }) => {
    if (value === 'true') return true;
    if (value === 'false') return false;
    return value;
  })
  isActive?: boolean;

  @IsOptional()
  @IsIn(['name', 'created_at', 'updated_at'])
  sortBy?: string;

  @IsOptional()
  @IsIn(['asc', 'desc'])
  order?: 'asc' | 'desc';
}
