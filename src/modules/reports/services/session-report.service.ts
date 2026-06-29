import {
  Injectable,
  NotFoundException,
  InternalServerErrorException,
} from '@nestjs/common';
import { ReportRepository } from '../repositories/report.repository';
import { AnswerSheet } from '@modules/assessments/entities/answer-sheet.entity';
import {
  AnswerEntry,
  GradingStatus,
} from '@modules/assessments/entities/answer-entry.entity';
import {
  AIGradingJob,
  AIGradingJobStatus,
} from '@modules/ai/entities/ai-grading-job.entity';
import { Question } from '@modules/questions/entities/question.entity';
import { QuestionType } from '@modules/questions/enums/question-type.enum';

@Injectable()
export class SessionReportService {
  constructor(private readonly reportRepo: ReportRepository) {}

  /**
   * Full session report for one participant's attempt.
   * Includes per-question detail, AI grading notes, human overrides.
   * Throws 404 if session not found for this assessment and client.
   */
  async getSessionReport(assessmentId: string | null, sessionId: string) {
    try {
      const sheet: AnswerSheet | null = await this.reportRepo.getSessionDetail(
        sessionId,
        assessmentId,
      );

      if (!sheet) throw new NotFoundException('Session not found');

      const participant = sheet.assessmentParticipant?.participant;
      const assessment = sheet.assessment;
      const settings = assessment?.settings;

      const entries: AnswerEntry[] = (sheet.entries ?? []).sort(
        (a, b) =>
          (a.assessmentQuestion?.order ?? 0) -
          (b.assessmentQuestion?.order ?? 0),
      );

      const questions = entries.map((entry) => {
        const aq = entry.assessmentQuestion;
        const snapshot: Partial<Question> = aq?.questionSnapshot ?? {};
        const latestAiJob: AIGradingJob | null = this.getLatestAiJob(
          entry.aiJobs ?? [],
        );

        // Parse reasoning if it is a JSON string containing more detailed fields
        let aiGrading: Record<string, any> | null = null;
        if (latestAiJob) {
          let parsedReasoning: Record<string, any> = {};
          try {
            parsedReasoning = JSON.parse(
              latestAiJob.reasoning || '{}',
            ) as Record<string, any>;
          } catch {
            parsedReasoning = { reasoning: latestAiJob.reasoning };
          }

          aiGrading = {
            suggestedScore:
              latestAiJob.suggestedScore !== null &&
              latestAiJob.suggestedScore !== undefined
                ? Number(latestAiJob.suggestedScore)
                : null,
            reasoning:
              (parsedReasoning.reasoning as string | undefined) ??
              latestAiJob.reasoning ??
              null,
            keyPointsAddressed:
              (parsedReasoning.keyPointsAddressed as string[] | undefined) ??
              [],
            keyPointsMissed:
              (parsedReasoning.keyPointsMissed as string[] | undefined) ?? [],
            confidence:
              (parsedReasoning.confidence as string | null | undefined) ?? null,
            flagForReview:
              (parsedReasoning.flagForReview as boolean | undefined) ?? false,
          };
        }

        return {
          entryId: entry.id,
          order: aq?.order ?? null,
          assessmentQuestionId: aq?.id ?? null,
          questionText: snapshot.questionText ?? null,
          type: snapshot.type ?? null,
          difficulty: snapshot.difficulty ?? null,
          maxScore:
            aq?.points !== null && aq?.points !== undefined
              ? Number(aq.points)
              : 0,
          scoreAwarded:
            entry.scoreAwarded !== null && entry.scoreAwarded !== undefined
              ? Number(entry.scoreAwarded)
              : null,
          gradingStatus: entry.gradingStatus,
          isCorrect:
            entry.scoreAwarded !== null &&
            entry.scoreAwarded !== undefined &&
            aq?.points !== null &&
            aq?.points !== undefined
              ? Number(entry.scoreAwarded) === Number(aq.points)
              : null,
          response: entry.response ?? null,
          correctAnswer: this.buildCorrectAnswerForReport(snapshot),
          options: this.buildOptionsForReport(snapshot),
          aiGrading,
          humanOverride:
            entry.gradingStatus === GradingStatus.MANUAL_REVISED &&
            entry.scoreAwarded !== null &&
            entry.scoreAwarded !== undefined
              ? { scoreAwarded: Number(entry.scoreAwarded) }
              : null,
        };
      });

      const maxScore = questions.reduce(
        (sum: number, q) => sum + (q.maxScore ?? 0),
        0,
      );
      const totalScore =
        sheet.totalScore !== null && sheet.totalScore !== undefined
          ? Number(sheet.totalScore)
          : null;
      const scorePercent =
        maxScore > 0 && totalScore !== null
          ? parseFloat(((totalScore / maxScore) * 100).toFixed(1))
          : null;

      const startedAt = sheet.startedAt;
      const submittedAt = sheet.submittedAt;
      const duration =
        startedAt && submittedAt
          ? parseFloat(
              (
                (new Date(submittedAt).getTime() -
                  new Date(startedAt).getTime()) /
                60000
              ).toFixed(1),
            )
          : null;

      return {
        data: {
          session: {
            id: sheet.id,
            assessmentId: sheet.assessmentId,
            assessmentTitle: assessment?.name ?? null,
            participantId: participant?.id ?? null,
            participantName: participant?.name ?? null,
            participantEmail: participant?.email ?? null,
            status: sheet.status,
            startedAt,
            submittedAt,
            duration,
            totalScore,
            maxScore,
            scorePercent,
            grade: sheet.grade ?? null,
            isPassed: sheet.isPassed,
            passMark: settings?.passMark ?? null,
          },
          questions,
        },
      };
    } catch (error) {
      if (error instanceof NotFoundException) throw error;
      throw new InternalServerErrorException(
        'Failed to generate session report',
      );
    }
  }

  // ---------------------------------------------------------------------------
  // PRIVATE HELPERS
  // ---------------------------------------------------------------------------

  /**
   * Returns the most recent completed AI grading job for an entry.
   */
  private getLatestAiJob(jobs: AIGradingJob[]): AIGradingJob | null {
    const completed = jobs
      .filter((j) => j.status === AIGradingJobStatus.COMPLETED)
      .sort((a, b) => {
        const timeA = a.processedAt ? new Date(a.processedAt).getTime() : 0;
        const timeB = b.processedAt ? new Date(b.processedAt).getTime() : 0;
        return timeB - timeA;
      });
    return completed[0] ?? null;
  }

  /**
   * Returns correctAnswer from snapshot for report display.
   * Strips internal fields not relevant to reporting.
   */
  private buildCorrectAnswerForReport(
    snapshot: Partial<Question>,
  ): Record<string, any> | null {
    const type = snapshot.type;
    const correctAnswer = snapshot.correctAnswer;
    if (!correctAnswer) return null;

    switch (type) {
      case QuestionType.SINGLE_CHOICE:
        return { optionId: correctAnswer.optionId as string | undefined };
      case QuestionType.MULTIPLE_CHOICE:
        return { optionIds: correctAnswer.optionIds as string[] | undefined };
      case QuestionType.TRUE_FALSE:
        return { value: correctAnswer.value as boolean | undefined };
      case QuestionType.ORDERING:
        return { sequence: correctAnswer.sequence as string[] | undefined };
      case QuestionType.MATCHING:
        return { pairs: correctAnswer.pairs as any[] | undefined };
      case QuestionType.FILL_IN_THE_BLANK:
        return { answers: correctAnswer.answers as string[] | undefined };
      case QuestionType.SHORT_ANSWER:
      case QuestionType.ESSAY:
        return {
          modelAnswerReference: correctAnswer.modelAnswerReference as
            | string
            | undefined,
          keyPointsExpected: correctAnswer.keyPointsExpected as
            | string[]
            | undefined,
        };
      default:
        return null;
    }
  }

  /**
   * Returns options from snapshot for report display.
   */
  private buildOptionsForReport(snapshot: Partial<Question>): any[] | null {
    const type = snapshot.type;
    const options = snapshot.options;
    if (!options) return null;

    switch (type) {
      case QuestionType.SINGLE_CHOICE:
      case QuestionType.MULTIPLE_CHOICE: {
        if (Array.isArray(options)) {
          return options.map((o: Record<string, any>) => ({
            id: String(o.id),
            text: String(o.text),
          }));
        }
        const innerOptions = options.options as
          | Record<string, any>[]
          | undefined;
        return (innerOptions ?? []).map((o) => ({
          id: String(o.id),
          text: String(o.text),
        }));
      }
      case QuestionType.TRUE_FALSE:
        return [
          // eslint-disable-next-line @typescript-eslint/no-base-to-string
          { id: 'true', text: String(options.trueLabel ?? 'True') },
          // eslint-disable-next-line @typescript-eslint/no-base-to-string
          { id: 'false', text: String(options.falseLabel ?? 'False') },
        ];
      case QuestionType.ORDERING: {
        const items = (options.items ?? options) as Record<string, any>[];
        return (Array.isArray(items) ? items : []).map((o) => ({
          id: String(o.id),
          text: String(o.text),
        }));
      }
      case QuestionType.MATCHING: {
        if (Array.isArray(options)) {
          return options.map((o: Record<string, any>) => ({
            leftSide: Array.isArray(o.leftSide)
              ? o.leftSide.map((x: Record<string, any>) => ({
                  id: String(x.id),
                  text: String(x.text),
                }))
              : [],
            rightSide: Array.isArray(o.rightSide)
              ? o.rightSide.map((x: Record<string, any>) => ({
                  id: String(x.id),
                  text: String(x.text),
                }))
              : [],
            pairs: Array.isArray(o.pairs)
              ? o.pairs.map((x: Record<string, any>) => ({
                  leftId: String(x.leftId),
                  rightId: String(x.rightId),
                }))
              : [],
          }));
        }
        return null;
      }
      case QuestionType.RATING:
        return [options];
      default:
        return null;
    }
  }
}
