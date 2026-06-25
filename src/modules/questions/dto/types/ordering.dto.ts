import { IsArray, IsString, IsNotEmpty, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';
import { KeyedOptionDto } from './shared.dto';
import { ApiProperty } from '@nestjs/swagger';

export class OrderingOptionsDto {
  @ApiProperty({ type: () => [KeyedOptionDto], description: 'List of items to be ordered' })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => KeyedOptionDto)
  items!: KeyedOptionDto[];
}

export class OrderingAnswerDto {
  @ApiProperty({ example: ['opt_3', 'opt_1', 'opt_2'], description: 'Array of item IDs in the correct sequence' })
  @IsArray()
  @IsString({ each: true })
  @IsNotEmpty({ each: true })
  sequence!: string[]; // Array of option IDs in correct sequence
}
