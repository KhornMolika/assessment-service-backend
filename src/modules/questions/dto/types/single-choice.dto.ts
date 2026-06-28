import { IsArray, IsString, IsNotEmpty, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';
import { KeyedOptionDto } from './shared.dto';
import { ApiProperty } from '@nestjs/swagger';

export class SingleChoiceOptionsDto {
  @ApiProperty({
    type: () => [KeyedOptionDto],
    description: 'List of available options',
  })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => KeyedOptionDto)
  options!: KeyedOptionDto[];
}

export class SingleChoiceAnswerDto {
  @ApiProperty({ example: 'opt_1', description: 'ID of the selected option' })
  @IsString()
  @IsNotEmpty()
  optionId!: string;
}
