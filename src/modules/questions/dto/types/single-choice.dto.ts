import { IsArray, IsString, IsNotEmpty, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';
import { KeyedOptionDto } from './shared.dto';

export class SingleChoiceSettingsDto {
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => KeyedOptionDto)
  options!: KeyedOptionDto[];
}

export class SingleChoiceAnswerDto {
  @IsString()
  @IsNotEmpty()
  optionId!: string;
}