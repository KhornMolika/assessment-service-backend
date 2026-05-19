import {
  IsEnum,
  IsOptional,
  IsString,
  Length,
  MaxLength,
} from 'class-validator';
import { TopicVisibility } from '../entities/topic.entity';

export class CreateTopicDto {
  @IsString({ message: 'name must be a string' })
  @Length(3, 256)
  name!: string;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  description?: string;

}