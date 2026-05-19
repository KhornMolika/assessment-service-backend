import { IsArray, IsString, IsNotEmpty, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';
import { KeyedOptionDto } from './shared.dto';

export class OrderingSettingsDto {
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => KeyedOptionDto)
  items!: KeyedOptionDto[];
}

export class OrderingAnswerDto {
  @IsArray()
  @IsString({ each: true })
  @IsNotEmpty({ each: true })
  sequence!: string[]; // Array of option IDs in correct sequence
}