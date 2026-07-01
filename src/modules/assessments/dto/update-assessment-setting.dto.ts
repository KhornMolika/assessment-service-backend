// -----------------------------------------------------------------------------
// All optional — only send fields that need updating.
// REAL_TIME + DYNAMIC rejected by service.
// DYNAMIC requires selectionRules.
// -----------------------------------------------------------------------------
import {
  IsBoolean,
  IsEnum,
  IsInt,
  IsOptional,
  IsArray,
  Min,
  ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';

import { SelectionRulesDto } from './selection-rules.dto';
import { GradeLabelDto } from './grade-label.dto';
import {
  Mode,
  ParticipantIdentity,
  QuestionSelection,
  ShowResults,
} from '../entities/assessment-settings.entity';

export class UpdateAssessmentSettingDto {
  @IsEnum(Mode)
  @IsOptional()
  mode?: Mode;

  @IsEnum(QuestionSelection)
  @IsOptional()
  questionSelection?: QuestionSelection;

  @IsEnum(ParticipantIdentity)
  @IsOptional()
  participantIdentity?: ParticipantIdentity;

  @IsInt()
  @Min(1)
  @IsOptional()
  numQuestions?: number;

  @ValidateNested()
  @Type(() => SelectionRulesDto)
  @IsOptional()
  selectionRules?: SelectionRulesDto;

  @IsInt()
  @Min(1)
  @IsOptional()
  timeLimit?: number;

  @IsOptional()
  startsAt?: Date;

  @IsOptional()
  endsAt?: Date;

  @IsInt()
  @Min(0)
  @IsOptional()
  passMark?: number;

  @IsBoolean()
  @IsOptional()
  isShuffle?: boolean;

  @IsEnum(ShowResults)
  @IsOptional()
  showResults?: ShowResults;

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => GradeLabelDto)
  @IsOptional()
  gradeLabels?: GradeLabelDto[];

  @IsBoolean()
  @IsOptional()
  isAllowShare?: boolean;

  @IsBoolean()
  @IsOptional()
  allowReview?: boolean;

  @IsBoolean()
  @IsOptional()
  manualGradingAIQues?: boolean;
}
