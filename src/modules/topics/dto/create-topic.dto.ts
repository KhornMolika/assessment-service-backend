import {
  IsOptional,
  IsString,
  Length,
  MaxLength,
} from 'class-validator';

export class CreateTopicDto {
  @IsString({ message: 'name must be a string' })
  @Length(3, 256)
  name!: string;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  description?: string;
}