import {
  IsOptional,
  IsString,
  Length,
  Matches,
  MaxLength,
} from 'class-validator';

export class CreateTopicDto {
  @IsString({ message: 'name must be a string' })
  @Length(3, 256)
  name!: string;

  @IsString({ message: 'slug must be a string' })
  @Length(3, 256)
  @Matches(/^[a-z0-9-]+$/, {
    message: "slug must be in lowercase letter, no space and must use dash (-) instead",
  })
  slug!: string;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  description?: string;
}