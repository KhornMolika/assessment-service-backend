import { IsArray, IsString, IsNotEmpty, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';
import { KeyedOptionDto } from './shared.dto';

class MatchPairDto {
  @IsString()
  @IsNotEmpty()
  leftId!: string;

  @IsString()
  @IsNotEmpty()
  rightId!: string;
}

export class MatchingSettingsDto {
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => KeyedOptionDto)
  leftSide!: KeyedOptionDto[];

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => KeyedOptionDto)
  rightSide!: KeyedOptionDto[];
}

export class MatchingAnswerDto {
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => MatchPairDto)
  pairs!: MatchPairDto[];
}