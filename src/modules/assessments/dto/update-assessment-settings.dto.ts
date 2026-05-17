import { IsOptional, IsNumber, IsBoolean, IsEnum } from 'class-validator';
import { Mode, QuestionSelection, ParticipantIdentity, ShowResults } from '../entities/assessment-settings.entity';

export class UpdateAssessmentSettingsDto {
  @IsOptional()
  @IsEnum(Mode)
  mode?: Mode;

  @IsOptional()
  @IsEnum(QuestionSelection)
  questionSelection?: QuestionSelection;

  @IsOptional()
  @IsEnum(ParticipantIdentity)
  participantIdentity?: ParticipantIdentity;

  @IsOptional()
  @IsNumber()
  numQuestions?: number;

  @IsOptional()
  @IsNumber()
  timeLimit?: number;

  @IsOptional()
  @IsNumber()
  passMark?: number;

  @IsOptional()
  @IsBoolean()
  isShuffle?: boolean;

  @IsOptional()
  @IsEnum(ShowResults)
  showResults?: ShowResults;

  @IsOptional()
  @IsBoolean()
  isAllowShare?: boolean;

  @IsOptional()
  @IsBoolean()
  allowReview?: boolean;

  @IsOptional()
  selectionRules?: any;

  @IsOptional()
  gradeLabels?: any;
}
