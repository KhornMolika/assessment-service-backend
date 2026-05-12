import {
  IsOptional,
  IsString,
  Length,
  Matches,
  MaxLength,
} from 'class-validator';

export class CreateTopicDto {
  @IsString()
  @Length(3, 256, {
    message: "Topic's name must be between 3 to 256 characters"
  })
  name!: string;

  @IsString()
  @Length(3, 256)
  @Matches(/^[a-z0-9-]+$/, {
    message: "slug must be in lowercase letter, no space and must use underscore (_)",
  })
  slug!: string;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  description?: string;
}