import {
  Injectable,
  NotFoundException,
  InternalServerErrorException,
} from '@nestjs/common';
import {
  ReportRepository,
  AssessmentStats,
  QuestionBreakdown,
  AnswerDistribution,
  ScoreDistribution,
  ParticipantResult,
  SurveyRatingDistribution,
  SurveyTextResponse,
} from '../repositories/report.repository';
import { AssessmentRepository } from '../../assessments/repositories/assessment.repository';
import { Assessment } from '@modules/assessments/entities/assessment.entity';

@Injectable()
export class AssessmentReportService {
  constructor(
    private readonly reportRepo: ReportRepository,
    private readonly assessments: AssessmentRepository,
  ) {}

  /**
   * Aggregated report for all participants in one assessment.
   * Routes to SURVEY report or Scored report based on assessment type.
   */
  async getAssessmentReport(
    assessmentId: string,
    page: number = 1,
    limit: number = 20,
  ) {
    try {
      const assessment = await this.assessments.findById(assessmentId);
      if (!assessment) throw new NotFoundException('Assessment not found');

      if ((assessment.type as unknown as string) === 'SURVEY') {
        return this.getSurveyReport(assessmentId, assessment);
      }

      return this.getScoredReport(assessmentId, assessment, page, limit);
    } catch (error) {
      if (error instanceof NotFoundException) throw error;
      throw new InternalServerErrorException(
        'Failed to generate assessment report',
      );
    }
  }

  /**
   * Generates report for a scored assessment (QUIZ, EXAM, PRACTICE).
   */
  private async getScoredReport(
    assessmentId: string,
    assessment: Assessment,
    page: number,
    limit: number,
  ) {
    const statsResult: AssessmentStats | null =
      await this.reportRepo.getAssessmentStats(assessmentId);
    const questionBreakdown: QuestionBreakdown[] =
      await this.reportRepo.getQuestionBreakdown(assessmentId);
    const distributions: AnswerDistribution[] =
      await this.reportRepo.getAnswerDistribution(assessmentId);
    const scoreDistribution: ScoreDistribution =
      await this.reportRepo.getScoreDistribution(assessmentId);
    const participantsResult: { rows: ParticipantResult[]; total: number } =
      await this.reportRepo.getAssessmentParticipants(
        assessmentId,
        page,
        limit,
      );

    const stats = statsResult ?? {
      totalParticipants: 0,
      completed: 0,
      pending: 0,
      averageScore: null,
      highestScore: null,
      lowestScore: null,
      passRate: null,
      averageDuration: null,
    };

    // Merge distribution into question breakdown
    const distMap = new Map<string, Record<string, number>>(
      distributions.map((d) => [d.assessmentQuestionId, d.distribution]),
    );

    const questions = questionBreakdown.map((q) => ({
      order: q.order,
      assessmentQuestionId: q.assessmentQuestionId,
      questionText: q.questionText,
      type: q.type,
      difficulty: q.difficulty,
      maxScore: q.maxScore,
      averageScore: q.averageScore,
      correctCount: q.correctCount,
      incorrectCount: q.incorrectCount,
      totalAnswers: q.totalAnswers,
      distribution: distMap.get(q.assessmentQuestionId) ?? {},
    }));

    return {
      data: {
        assessment: {
          id: assessmentId,
          title: assessment.name,
          type: assessment.type,
          totalParticipants: stats.totalParticipants,
          completed: stats.completed,
          pending: stats.pending,
          averageScore: stats.averageScore,
          highestScore: stats.highestScore,
          lowestScore: stats.lowestScore,
          passRate: stats.passRate,
          averageDuration: stats.averageDuration,
        },
        questionBreakdown: questions,
        scoreDistribution,
        participants: participantsResult.rows.map((p) => ({
          participantId: p.participantId,
          name: p.name,
          email: p.email,
          sessionId: p.sessionId,
          score: p.score,
          grade: p.grade,
          isPassed: p.isPassed,
          duration: p.duration,
          submittedAt: p.submittedAt,
        })),
      },
      meta: {
        total: participantsResult.total,
        page,
        limit,
        pageCount: Math.ceil(participantsResult.total / limit),
      },
    };
  }

  /**
   * Generates report for a survey assessment.
   */
  private async getSurveyReport(assessmentId: string, assessment: Assessment) {
    const statsResult: AssessmentStats | null =
      await this.reportRepo.getAssessmentStats(assessmentId);
    const ratingRows: SurveyRatingDistribution[] =
      await this.reportRepo.getSurveyRatingDistribution(assessmentId);
    const textRows: SurveyTextResponse[] =
      await this.reportRepo.getSurveyTextResponses(assessmentId);
    const questionBreakdown: QuestionBreakdown[] =
      await this.reportRepo.getQuestionBreakdown(assessmentId);

    const stats = statsResult ?? {
      totalParticipants: 0,
      completed: 0,
      pending: 0,
      averageScore: null,
      highestScore: null,
      lowestScore: null,
      passRate: null,
      averageDuration: null,
    };

    // Build rating distribution map
    const ratingMap: Record<
      string,
      { distribution: Record<string, number>; averageRating: number }
    > = {};
    for (const row of ratingRows) {
      if (!ratingMap[row.assessmentQuestionId]) {
        ratingMap[row.assessmentQuestionId] = {
          distribution: {},
          averageRating: parseFloat(row.averageRating.toFixed(2)),
        };
      }
      ratingMap[row.assessmentQuestionId].distribution[row.rating] = row.count;
    }

    // Build text responses map
    const textMap: Record<string, any[]> = {};
    for (const row of textRows) {
      if (!textMap[row.assessmentQuestionId]) {
        textMap[row.assessmentQuestionId] = [];
      }
      textMap[row.assessmentQuestionId].push({
        participantId: row.participantId,
        name: row.name,
        response: row.response,
      });
    }

    const questions = questionBreakdown.map((q) => {
      const type = q.type;

      if (type === 'RATING') {
        const ratingData = ratingMap[q.assessmentQuestionId] ?? {};
        return {
          order: q.order,
          assessmentQuestionId: q.assessmentQuestionId,
          questionText: q.questionText,
          type,
          totalResponses: q.totalAnswers,
          averageRating: ratingData.averageRating ?? null,
          distribution: ratingData.distribution ?? {},
        };
      }

      if (type === 'SHORT_ANSWER' || type === 'ESSAY') {
        return {
          order: q.order,
          assessmentQuestionId: q.assessmentQuestionId,
          questionText: q.questionText,
          type,
          totalResponses: q.totalAnswers,
          responses: textMap[q.assessmentQuestionId] ?? [],
        };
      }

      // Fallback for other question types in a survey
      return {
        order: q.order,
        assessmentQuestionId: q.assessmentQuestionId,
        questionText: q.questionText,
        type,
        totalResponses: q.totalAnswers,
      };
    });

    const totalRespondents = stats.totalParticipants;
    const completed = stats.completed;

    return {
      data: {
        assessment: {
          id: assessmentId,
          title: assessment.name,
          type: 'SURVEY',
          totalRespondents,
          completed,
          pending: stats.pending,
          completionRate:
            totalRespondents > 0
              ? parseFloat(((completed / totalRespondents) * 100).toFixed(1))
              : 0,
        },
        questions,
      },
    };
  }
}
