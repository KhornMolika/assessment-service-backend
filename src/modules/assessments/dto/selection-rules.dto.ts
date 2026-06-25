// -----------------------------------------------------------------------------
// Defines how DYNAMIC question selection should work.
// source=bank pulls from a specific bank; source=topic pulls from all topic questions.
// distribution must sum to total.
// -----------------------------------------------------------------------------

import {
  IsEnum,
  IsUUID,
  IsInt,
  IsOptional,
  Min,
  ValidateIf,
  ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty } from '@nestjs/swagger';

export enum SelectionSource {
  BANK = 'bank',
  TOPIC = 'topic',
}

export class DistributionDto {
  @ApiProperty({ example: 10, description: 'Number of easy questions', minimum: 0, required: false })
  @IsInt()
  @Min(0)
  @IsOptional()
  easy?: number;

  @ApiProperty({ example: 5, description: 'Number of medium questions', minimum: 0, required: false })
  @IsInt()
  @Min(0)
  @IsOptional()
  medium?: number;

  @ApiProperty({ example: 2, description: 'Number of hard questions', minimum: 0, required: false })
  @IsInt()
  @Min(0)
  @IsOptional()
  hard?: number;
}

export class SelectionRulesDto {
  @ApiProperty({ example: SelectionSource.BANK, enum: SelectionSource, description: 'The source for question selection' })
  @IsEnum(SelectionSource)
  source!: SelectionSource;

  @ApiProperty({ example: '123e4567-e89b-12d3-a456-426614174000', description: 'The UUID of the bank (required if source is bank)', required: false })
  @IsUUID()
  @ValidateIf((o) => o.source === SelectionSource.BANK)
  bankId?: string;

  @ApiProperty({ example: 17, description: 'The total number of questions to select', minimum: 1 })
  @IsInt()
  @Min(1)
  total!: number;

  @ApiProperty({ type: () => DistributionDto, description: 'The distribution of questions by difficulty', required: false })
  @ValidateNested()
  @Type(() => DistributionDto)
  @IsOptional()
  distribution?: DistributionDto;
}
