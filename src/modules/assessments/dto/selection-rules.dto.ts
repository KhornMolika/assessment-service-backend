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

export enum SelectionSource {
  BANK = 'bank',
  TOPIC = 'topic',
}

export class DistributionDto {
  @IsInt()
  @Min(0)
  @IsOptional()
  easy?: number;

  @IsInt()
  @Min(0)
  @IsOptional()
  medium?: number;

  @IsInt()
  @Min(0)
  @IsOptional()
  hard?: number;
}

export class SelectionRulesDto {
  @IsEnum(SelectionSource)
  source!: SelectionSource;

  @IsUUID()
  @ValidateIf((o) => o.source === SelectionSource.BANK)
  bankId?: string;

  @IsInt()
  @Min(1)
  total!: number;

  @ValidateNested()
  @Type(() => DistributionDto)
  @IsOptional()
  distribution?: DistributionDto;
}
