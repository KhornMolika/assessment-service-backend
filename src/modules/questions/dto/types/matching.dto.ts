import { IsArray, IsString, IsNotEmpty, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';
import { KeyedOptionDto } from './shared.dto';
import { ApiProperty } from '@nestjs/swagger';

class MatchPairDto {
  @ApiProperty({ example: 'left_1', description: 'ID of the left side option' })
  @IsString()
  @IsNotEmpty()
  leftId!: string;

  @ApiProperty({
    example: 'right_1',
    description: 'ID of the matched right side option',
  })
  @IsString()
  @IsNotEmpty()
  rightId!: string;
}

export class MatchingOptionsDto {
  @ApiProperty({
    type: () => [KeyedOptionDto],
    description: 'Options for the left side of the matching question',
  })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => KeyedOptionDto)
  leftSide!: KeyedOptionDto[];

  @ApiProperty({
    type: () => [KeyedOptionDto],
    description: 'Options for the right side of the matching question',
  })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => KeyedOptionDto)
  rightSide!: KeyedOptionDto[];
}

export class MatchingAnswerDto {
  @ApiProperty({
    type: () => [MatchPairDto],
    description: 'Array of matched pairs',
  })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => MatchPairDto)
  pairs!: MatchPairDto[];
}
