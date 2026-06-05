import { IsArray, IsString, IsNotEmpty, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';
import { KeyedOptionDto } from './shared.dto';
import { ApiProperty } from '@nestjs/swagger';

export class MultipleChoiceOptionsDto {
  @ApiProperty({ type: () => [KeyedOptionDto], description: 'List of options for multiple choice' })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => KeyedOptionDto)
  options!: KeyedOptionDto[];
}

export class MultipleChoiceAnswerDto {
  @ApiProperty({ example: ['opt_1', 'opt_3'], description: 'List of IDs of the selected correct options' })
  @IsArray()
  @IsString({ each: true })
  @IsNotEmpty({ each: true })
  optionIds!: string[];
}
