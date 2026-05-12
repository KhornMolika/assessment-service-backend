import { Transform } from 'class-transformer';
import {
  IsBoolean,
  IsOptional,
} from 'class-validator';
import { PartialType } from '@nestjs/mapped-types';
import { CreateTopicDto } from './create-topic.dto';

export class UpdateTopicDto extends PartialType (CreateTopicDto) {
  @IsOptional()
  @Transform(({ value }) => {
    if (typeof value === 'boolean') return value;
    if (value === 'true' || value === 1) return true;
    if (value === 'false' || value === 0) return false;
    return value;
  })
  @IsBoolean()
  isActive?: boolean;
}
