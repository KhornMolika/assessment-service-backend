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
import { ApiProperty } from '@nestjs/swagger';

import { SelectionRulesDto } from './selection-rules.dto';
import { GradeLabelDto } from './grade-label.dto';
import {
  Mode,
  ParticipantIdentity,
  QuestionSelection,
  ShowResults,
} from '../entities/assessment-settings.entity';

export class UpdateAssessmentSettingDto {
  @ApiProperty({
    example: Mode.SELF_PACED,
    enum: Mode,
    description: 'The mode of the assessment',
    required: false,
  })
  @IsEnum(Mode)
  @IsOptional()
  mode?: Mode;

  @ApiProperty({
    example: QuestionSelection.MANUAL,
    enum: QuestionSelection,
    description: 'How questions are selected',
    required: false,
  })
  @IsEnum(QuestionSelection)
  @IsOptional()
  questionSelection?: QuestionSelection;

  @ApiProperty({
    example: ParticipantIdentity.AUTHENTICATED,
    enum: ParticipantIdentity,
    description: 'Participant identity requirement',
    required: false,
  })
  @IsEnum(ParticipantIdentity)
  @IsOptional()
  participantIdentity?: ParticipantIdentity;

  @ApiProperty({
    example: 20,
    description: 'Number of questions',
    minimum: 1,
    required: false,
  })
  @IsInt()
  @Min(1)
  @IsOptional()
  numQuestions?: number;

  @ApiProperty({
    type: () => SelectionRulesDto,
    description: 'Rules for dynamic selection',
    required: false,
  })
  @ValidateNested()
  @Type(() => SelectionRulesDto)
  @IsOptional()
  selectionRules?: SelectionRulesDto;

  @ApiProperty({
    example: 3600,
    description: 'Time limit in seconds',
    minimum: 1,
    required: false,
  })
  @IsInt()
  @Min(1)
  @IsOptional()
  timeLimit?: number;

  @ApiProperty({
    example: '2023-01-01T00:00:00Z',
    description: 'Start time of the assessment',
    required: false,
  })
  @IsOptional()
  startsAt?: Date;

  @ApiProperty({
    example: '2023-01-01T23:59:59Z',
    description: 'End time of the assessment',
    required: false,
  })
  @IsOptional()
  endsAt?: Date;

  @ApiProperty({
    example: 50,
    description: 'Pass mark percentage',
    minimum: 0,
    required: false,
  })
  @IsInt()
  @Min(0)
  @IsOptional()
  passMark?: number;

  @ApiProperty({
    example: true,
    description: 'Whether to shuffle questions',
    required: false,
  })
  @IsBoolean()
  @IsOptional()
  isShuffle?: boolean;

  @ApiProperty({
    example: ShowResults.IMMEDIATELY,
    enum: ShowResults,
    description: 'When to show results',
    required: false,
  })
  @IsEnum(ShowResults)
  @IsOptional()
  showResults?: ShowResults;

  @ApiProperty({
    type: [GradeLabelDto],
    description: 'Grade labels for scoring',
    required: false,
  })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => GradeLabelDto)
  @IsOptional()
  gradeLabels?: GradeLabelDto[];

  @ApiProperty({
    example: true,
    description: 'Whether sharing is allowed',
    required: false,
  })
  @IsBoolean()
  @IsOptional()
  isAllowShare?: boolean;

  @ApiProperty({
    example: true,
    description: 'Whether review is allowed',
    required: false,
  })
  @IsBoolean()
  @IsOptional()
  allowReview?: boolean;

  @ApiProperty({
    example: true,
    description: 'Whether AI questions require manual grading',
    required: false,
  })
  @IsBoolean()
  @IsOptional()
  manualGradingAIQues?: boolean;
}
