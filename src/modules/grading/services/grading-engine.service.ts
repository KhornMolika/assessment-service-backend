import {
  Injectable,
  Optional,
  Logger,
  NotFoundException,
  InternalServerErrorException,
} from '@nestjs/common';
import { AnswerSheetRepository } from '@modules/runtime/repositories/answer-sheet.repository';
import { AnswerEntryRepository } from '@modules/runtime/repositories/answer-entry.repository';
import { AnswerSheetStatus } from '@modules/assessments/entities/answer-sheet.entity';
import { GradingStatus } from '@modules/assessments/entities/answer-entry.entity';
import { AssessmentSettingRepository } from '@modules/assessments/repositories/assessment-setting.repository';
import { SingleChoiceStrategy } from '../strategies/single-choice.strategy';
import { MultipleChoiceStrategy } from '../strategies/multiple-choice.strategy';
import { TrueFalseStrategy } from '../strategies/true-false.strategy';
import { OrderingStrategy } from '../strategies/ordering.strategy';
import { FillInTheBlankStrategy } from '../strategies/fill-in-the-blank.strategy';
import { MatchingStrategy } from '../strategies/matching.strategy';
import { RatingStrategy } from '../strategies/rating.strategy';
import { GradingStrategy } from '../strategies/grading-strategy.interface';
import { AIGradingService } from '@modules/ai/services/ai-grading.service';
import { WebhookService } from '@modules/webhooks/webhook.service';

// Question types that require AI grading — deferred until AI provider decided
const AI_GRADED_TYPES = ['SHORT_ANSWER', 'ESSAY'];

interface QuestionSnapshot {
  type: string;
  correctAnswer?: Record<string, unknown>;
}

interface GradeLabel {
  name: string;
  min: number;
}

@Injectable()
export class GradingEngineService {
  private readonly logger = new Logger(GradingEngineService.name);

  // Strategy registry — maps question type to its grading strategy
  private readonly strategies: Record<string, GradingStrategy> = {
    SINGLE_CHOICE: new SingleChoiceStrategy(),
    MULTIPLE_CHOICE: new MultipleChoiceStrategy(),
    TRUE_FALSE: new TrueFalseStrategy(),
    ORDERING: new OrderingStrategy(),
    FILL_IN_THE_BLANK: new FillInTheBlankStrategy(),
    MATCHING: new MatchingStrategy(),
    RATING: new RatingStrategy(),
  };

  constructor(
    private readonly answerSheets: AnswerSheetRepository,
    private readonly answerEntries: AnswerEntryRepository,
    private readonly assessmentSettings: AssessmentSettingRepository,
    @Optional()
    private readonly aiGrading?: AIGradingService,
    @Optional()
    private readonly webhooks?: WebhookService,
  ) {}

  // ---------------------------------------------------------------------------
  // GRADE SESSION
  // ---------------------------------------------------------------------------

  /**
   * Main entry point called after submit.
   * Grades all auto-gradable entries synchronously.
   * Leaves AI-graded entries as PENDING.
   * Updates AnswerSheet with total score, grade label, isPassed, and status.
   */
  async gradeSession(sessionId: string): Promise<void> {
    try {
      const sheet = await this.answerSheets.findOneWithEntries(sessionId);
      if (!sheet) throw new NotFoundException('Session not found');

      const settings = await this.assessmentSettings.findByAssessment(
        sheet.assessmentId,
      );

      // Grade each entry
      let totalScoreAwarded = 0;
      let totalMaxScore = 0;
      let hasAiPending = false;

      for (const entry of sheet.entries) {
        const snapshot = entry.assessmentQuestion
          ?.questionSnapshot as unknown as QuestionSnapshot;
        if (!snapshot) continue;

        const questionType = snapshot.type;
        const correctAnswer = snapshot.correctAnswer ?? {};
        const maxScore = Number(entry.assessmentQuestion?.points ?? 0);

        totalMaxScore += maxScore;

        if (AI_GRADED_TYPES.includes(questionType)) {
          hasAiPending = true;
          if (settings?.manualGradingAIQues) {
            try {
              await this.answerEntries.update(
                { id: entry.id },
                {
                  scoreAwarded: null as unknown as number,
                  maxScore,
                  gradingStatus: GradingStatus.PENDING,
                },
              );
              this.logger.log(
                `Entry [${entry.id}] of type [${questionType}] set to PENDING for manual grading`,
              );
            } catch (error) {
              this.logger.error(
                `Failed to set entry [${entry.id}] to PENDING for manual grading`,
                error,
              );
            }
          } else if (this.aiGrading) {
            try {
              await this.aiGrading.queueGradingJob(entry.id, entry.clientId);
            } catch (error) {
              this.logger.error(
                `Failed to queue AI grading job for entry [${entry.id}]`,
                error,
              );
            }
          } else {
            this.logger.warn('AI grading service is not configured');
          }
          continue;
        }

        // Run auto-grading strategy
        const strategy = this.strategies[questionType];
        if (!strategy) {
          this.logger.warn(
            `No grading strategy found for type [${questionType}] — skipping`,
          );
          continue;
        }

        try {
          const response =
            (entry.response as unknown as Record<string, unknown>) ?? {};
          const result = strategy.grade(response, correctAnswer, maxScore);

          await this.answerEntries.update(
            { id: entry.id },
            {
              scoreAwarded: result.scoreAwarded,
              maxScore: result.maxScore,
              gradingStatus: GradingStatus.AUTOMATIC,
            },
          );

          totalScoreAwarded += result.scoreAwarded;
        } catch (error) {
          this.logger.error(
            `Failed to grade entry ${entry.id} type [${questionType}]`,
            error,
          );
        }
      }

      // Determine final sheet status
      const sheetStatus = hasAiPending
        ? AnswerSheetStatus.REQUIRES_REVIEW
        : AnswerSheetStatus.GRADED;

      // Compute grade label and pass/fail
      const passMark = settings?.passMark ?? null;
      const scorePercent =
        totalMaxScore > 0 ? (totalScoreAwarded / totalMaxScore) * 100 : 0;

      const isPassed = passMark !== null ? scorePercent >= passMark : false;

      const gradeLabels =
        (settings?.gradeLabels as unknown as GradeLabel[]) ?? [];
      const grade = this.computeGradeLabel(scorePercent, gradeLabels);

      // Update answer sheet
      await this.answerSheets.update(
        { id: sessionId },
        {
          totalScore: parseFloat(totalScoreAwarded.toFixed(2)),
          grade,
          isPassed,
          status: sheetStatus,
        },
      );

      this.logger.log(
        `Session ${sessionId} graded — ` +
          `score: ${totalScoreAwarded}/${totalMaxScore} ` +
          `(${scorePercent.toFixed(1)}%) ` +
          `passed: ${isPassed} ` +
          `status: ${sheetStatus}`,
      );

      if (
        sheetStatus === AnswerSheetStatus.GRADED &&
        this.webhooks &&
        sheet.clientId
      ) {
        await this.webhooks.dispatch(sheet.clientId, 'assessment.graded', {
          assessmentId: sheet.assessmentId,
          sessionId: sheet.id,
          totalScore: totalScoreAwarded,
          maxScore: totalMaxScore,
          isPassed,
          grade,
        });
      }
    } catch (error) {
      this.logger.error(`Failed to grade session ${sessionId}`, error);
      throw new InternalServerErrorException(
        `Grading failed for session ${sessionId}`,
      );
    }
  }

  // ---------------------------------------------------------------------------
  // RECALCULATE SESSION
  // ---------------------------------------------------------------------------

  /**
   * Recalculates total score and grade for a session.
   * Called by POST /internal/assessments/:id/recalculate
   * after AI grading completes or a human overrides a score.
   * Reads current scoreAwarded values from entries — does not re-run strategies.
   */
  async recalculateSession(sessionId: string): Promise<void> {
    try {
      const sheet = await this.answerSheets.findOneWithEntries(sessionId);
      if (!sheet) throw new NotFoundException('Session not found');

      const settings = await this.assessmentSettings.findByAssessment(
        sheet.assessmentId,
      );

      let totalScoreAwarded = 0;
      let totalMaxScore = 0;
      let hasAiPending = false;

      for (const entry of sheet.entries) {
        const maxScore = Number(entry.assessmentQuestion?.points ?? 0);
        totalMaxScore += maxScore;

        if (entry.gradingStatus === GradingStatus.PENDING) {
          hasAiPending = true;
          continue;
        }

        totalScoreAwarded += Number(entry.scoreAwarded ?? 0);
      }

      const sheetStatus = hasAiPending
        ? AnswerSheetStatus.REQUIRES_REVIEW
        : AnswerSheetStatus.GRADED;

      const scorePercent =
        totalMaxScore > 0 ? (totalScoreAwarded / totalMaxScore) * 100 : 0;

      const passMark = settings?.passMark ?? null;
      const isPassed = passMark !== null ? scorePercent >= passMark : false;

      const gradeLabels =
        (settings?.gradeLabels as unknown as GradeLabel[]) ?? [];
      const grade = this.computeGradeLabel(scorePercent, gradeLabels);

      await this.answerSheets.update(
        { id: sessionId },
        {
          totalScore: parseFloat(totalScoreAwarded.toFixed(2)),
          grade,
          isPassed,
          status: sheetStatus,
        },
      );

      this.logger.log(
        `Session ${sessionId} recalculated — ` +
          `score: ${totalScoreAwarded}/${totalMaxScore}`,
      );

      if (
        sheetStatus === AnswerSheetStatus.GRADED &&
        this.webhooks &&
        sheet.clientId
      ) {
        await this.webhooks.dispatch(sheet.clientId, 'assessment.graded', {
          assessmentId: sheet.assessmentId,
          sessionId: sheet.id,
          totalScore: totalScoreAwarded,
          maxScore: totalMaxScore,
          isPassed,
          grade,
        });
      }
    } catch (error) {
      this.logger.error(`Failed to recalculate session ${sessionId}`, error);
      throw new InternalServerErrorException(
        `Recalculation failed for session ${sessionId}`,
      );
    }
  }

  // ---------------------------------------------------------------------------
  // PRIVATE HELPERS
  // ---------------------------------------------------------------------------

  /**
   * Computes a grade label from the assessment's gradeLabels config.
   * gradeLabels: [{ name: 'A', min: 90 }, { name: 'B', min: 75 }, ...]
   * Returns the label whose min threshold the score meets or exceeds.
   * Returns null if no gradeLabels configured.
   */
  private computeGradeLabel(
    scorePercent: number,
    gradeLabels: GradeLabel[],
  ): string | undefined {
    if (!gradeLabels || gradeLabels.length === 0) return undefined;

    // Sort descending by min so highest threshold is checked first
    const sorted = [...gradeLabels].sort((a, b) => b.min - a.min);

    for (const label of sorted) {
      if (scorePercent >= label.min) {
        return label.name;
      }
    }

    return undefined;
  }
}
