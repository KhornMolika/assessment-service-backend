import { IsArray, IsString, IsNotEmpty, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';
import { KeyedOptionDto } from './shared.dto';

export class MultipleChoiceOptionsDto {
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => KeyedOptionDto)
  options!: KeyedOptionDto[];
}

export class MultipleChoiceAnswerDto {
  @IsArray()
  @IsString({ each: true })
  @IsNotEmpty({ each: true })
  optionIds!: string[];
}