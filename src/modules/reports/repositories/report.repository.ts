import { Injectable } from '@nestjs/common';
import { DataSource } from 'typeorm';
import { ClientContextService } from '@common/context/client-context.service';
import { AnswerSheet } from '@modules/assessments/entities/answer-sheet.entity';

export interface AssessmentStats {
  totalParticipants: number;
  completed: number;
  pending: number;
  averageScore: number | null;
  highestScore: number | null;
  lowestScore: number | null;
  passRate: number | null;
  averageDuration: number | null;
}

export interface QuestionBreakdown {
  order: number;
  assessmentQuestionId: string;
  questionText: string;
  type: string;
  difficulty: string;
  maxScore: number;
  averageScore: number | null;
  correctCount: number;
  incorrectCount: number;
  totalAnswers: number;
}

export interface AnswerDistribution {
  assessmentQuestionId: string;
  distribution: Record<string, number>;
}

export interface ScoreDistribution {
  '90-100': number;
  '80-89': number;
  '70-79': number;
  '60-69': number;
  'below-60': number;
}

export interface ParticipantResult {
  participantId: string;
  name: string | null;
  email: string | null;
  sessionId: string;
  status: string;
  score: number | null;
  grade: string | null;
  isPassed: boolean;
  duration: number | null;
  submittedAt: Date | null;
}

export interface SurveyRatingDistribution {
  assessmentQuestionId: string;
  rating: string;
  count: number;
  averageRating: number;
}

export interface SurveyTextResponse {
  assessmentQuestionId: string;
  participantId: string;
  name: string | null;
  response: string;
}

export interface ParticipantStats {
  totalAssessmentsTaken: number;
  totalPassed: number;
  totalFailed: number;
  averageScore: number | null;
}

export interface ParticipantAssessment {
  assessmentId: string;
  sessionId: string;
  title: string;
  type: string;
  topicTitle: string;
  score: number | null;
  maxScore: number | null;
  grade: string | null;
  isPassed: boolean;
  submittedAt: Date | null;
  duration: number | null;
}

@Injectable()
export class ReportRepository {
  constructor(private readonly dataSource: DataSource) {}

  private get clientId(): string {
    return ClientContextService.getClientId();
  }

  // ---------------------------------------------------------------------------
  // SESSION REPORT QUERIES
  // ---------------------------------------------------------------------------

  /**
   * Returns the answer sheet with all entries, their assessment questions,
   * AI grading jobs, and participant info for a single session.
   */
  async getSessionDetail(
    sessionId: string,
    assessmentId?: string | null,
  ): Promise<AnswerSheet | null> {
    const builder = this.dataSource
      .getRepository(AnswerSheet)
      .createQueryBuilder('sheet')
      .leftJoinAndSelect('sheet.entries', 'entries')
      .leftJoinAndSelect('entries.assessmentQuestion', 'aq')
      .leftJoinAndSelect('entries.aiJobs', 'aiJobs')
      .leftJoinAndSelect('sheet.assessmentParticipant', 'ap')
      .leftJoinAndSelect('ap.participant', 'participant')
      .leftJoinAndSelect('sheet.assessment', 'assessment')
      .leftJoinAndSelect('assessment.settings', 'settings')
      .where('sheet.id = :sessionId', { sessionId })
      .andWhere('sheet.clientId = :clientId', { clientId: this.clientId })
      .andWhere('sheet.deletedAt IS NULL');

    if (assessmentId) {
      builder.andWhere('sheet.assessmentId = :assessmentId', { assessmentId });
    }

    return builder.getOne();
  }

  // ---------------------------------------------------------------------------
  // ASSESSMENT REPORT QUERIES
  // ---------------------------------------------------------------------------

  /**
   * Returns aggregate stats for an assessment.
   * Counts total, completed, pending, average score, pass rate, avg duration.
   */
  async getAssessmentStats(
    assessmentId: string,
  ): Promise<AssessmentStats | null> {
    interface RawStats {
      totalParticipants: number;
      completed: number;
      pending: number;
      averageScore: string | null;
      highestScore: string | null;
      lowestScore: string | null;
      passRate: string | null;
      averageDuration: string | null;
    }

    const result = await this.dataSource.query<RawStats[]>(
      `
      SELECT
        COUNT(*)::int                                          AS "totalParticipants",
        COUNT(*) FILTER (WHERE status IN ('GRADED','REQUIRES_REVIEW'))::int AS "completed",
        COUNT(*) FILTER (WHERE status IN ('IN_PROGRESS','SUBMITTED'))::int  AS "pending",
        ROUND(AVG(CASE WHEN "totalScore" IS NOT NULL THEN "totalScore" END)::numeric, 2)
                                                               AS "averageScore",
        MAX("totalScore")                                      AS "highestScore",
        MIN("totalScore") FILTER (WHERE "totalScore" IS NOT NULL)
                                                               AS "lowestScore",
        ROUND(
          COUNT(*) FILTER (WHERE "isPassed" = true)::numeric /
          NULLIF(COUNT(*) FILTER (WHERE status IN ('GRADED','REQUIRES_REVIEW')), 0) * 100,
          1
        )                                                      AS "passRate",
        ROUND(AVG(
          EXTRACT(EPOCH FROM ("submittedAt" - "startedAt")) / 60
        ) FILTER (WHERE "submittedAt" IS NOT NULL), 1)        AS "averageDuration"
      FROM answer_sheet
      WHERE "assessmentId" = $1
        AND "clientId" = $2
        AND "deletedAt" IS NULL
      `,
      [assessmentId, this.clientId],
    );

    const row = result[0];
    if (!row) return null;

    return {
      totalParticipants: Number(row.totalParticipants),
      completed: Number(row.completed),
      pending: Number(row.pending),
      averageScore: row.averageScore !== null ? Number(row.averageScore) : null,
      highestScore: row.highestScore !== null ? Number(row.highestScore) : null,
      lowestScore: row.lowestScore !== null ? Number(row.lowestScore) : null,
      passRate: row.passRate !== null ? Number(row.passRate) : null,
      averageDuration:
        row.averageDuration !== null ? Number(row.averageDuration) : null,
    };
  }

  /**
   * Returns per-question breakdown for an assessment.
   * Average score, correct/incorrect counts, answer distribution.
   */
  async getQuestionBreakdown(
    assessmentId: string,
  ): Promise<QuestionBreakdown[]> {
    interface RawBreakdown {
      order: number;
      assessmentQuestionId: string;
      questionText: string;
      type: string;
      difficulty: string;
      maxScore: string;
      averageScore: string | null;
      correctCount: number;
      incorrectCount: number;
      totalAnswers: number;
    }

    const rows = await this.dataSource.query<RawBreakdown[]>(
      `
      SELECT
        aq."order",
        aq.id                                                  AS "assessmentQuestionId",
        aq."questionSnapshot"->>'questionText'                 AS "questionText",
        aq."questionSnapshot"->>'type'                         AS "type",
        aq."questionSnapshot"->>'difficulty'                   AS "difficulty",
        aq.points                                              AS "maxScore",
        ROUND(AVG(ae."scoreAwarded")::numeric, 2)             AS "averageScore",
        COUNT(*) FILTER (WHERE ae."scoreAwarded" = aq.points)::int AS "correctCount",
        COUNT(*) FILTER (WHERE ae."scoreAwarded" < aq.points OR ae."scoreAwarded" IS NULL)::int AS "incorrectCount",
        COUNT(ae.id)::int                                      AS "totalAnswers"
      FROM assessment_question aq
      LEFT JOIN answer_entry ae ON ae."assessmentQuestionId" = aq.id
        AND ae."deletedAt" IS NULL
      WHERE aq."assessmentId" = $1
        AND aq."clientId" = $2
        AND aq."deletedAt" IS NULL
      GROUP BY aq.id, aq."order", aq.points
      ORDER BY aq."order" ASC
      `,
      [assessmentId, this.clientId],
    );

    return rows.map((row) => ({
      order: Number(row.order),
      assessmentQuestionId: row.assessmentQuestionId,
      questionText: row.questionText,
      type: row.type,
      difficulty: row.difficulty,
      maxScore: Number(row.maxScore),
      averageScore: row.averageScore !== null ? Number(row.averageScore) : null,
      correctCount: Number(row.correctCount),
      incorrectCount: Number(row.incorrectCount),
      totalAnswers: Number(row.totalAnswers),
    }));
  }

  /**
   * Returns answer distribution per question (how many picked each option).
   * Returns raw response JSONB aggregated by assessmentQuestionId.
   */
  async getAnswerDistribution(
    assessmentId: string,
  ): Promise<AnswerDistribution[]> {
    interface RawDistribution {
      assessmentQuestionId: string;
      choice: string | null;
      value: string | null;
      count: number;
    }

    const rows = await this.dataSource.query<RawDistribution[]>(
      `
      SELECT
        ae."assessmentQuestionId",
        ae.response->>'optionId'    AS choice,
        ae.response->>'value'       AS value,
        COUNT(*)::int               AS count
      FROM answer_entry ae
      JOIN answer_sheet sheet ON sheet.id = ae."answerSheetId"
      WHERE sheet."assessmentId" = $1
        AND sheet."clientId" = $2
        AND ae."deletedAt" IS NULL
        AND sheet."deletedAt" IS NULL
      GROUP BY ae."assessmentQuestionId", ae.response->>'optionId', ae.response->>'value'
      `,
      [assessmentId, this.clientId],
    );

    // Group by assessmentQuestionId
    const map: Record<string, Record<string, number>> = {};
    for (const row of rows) {
      const key = row.assessmentQuestionId;
      const choice = row.choice ?? row.value ?? 'other';
      if (!map[key]) map[key] = {};
      map[key][choice] = Number(row.count);
    }

    return Object.entries(map).map(([assessmentQuestionId, distribution]) => ({
      assessmentQuestionId,
      distribution,
    }));
  }

  /**
   * Returns score distribution bucketed into ranges.
   */
  async getScoreDistribution(assessmentId: string): Promise<ScoreDistribution> {
    interface RawBucket {
      bucket: string;
      count: number;
    }

    const rows = await this.dataSource.query<RawBucket[]>(
      `
      SELECT
        CASE
          WHEN "totalScore" >= 90 THEN '90-100'
          WHEN "totalScore" >= 80 THEN '80-89'
          WHEN "totalScore" >= 70 THEN '70-79'
          WHEN "totalScore" >= 60 THEN '60-69'
          ELSE 'below-60'
        END AS bucket,
        COUNT(*)::int AS count
      FROM answer_sheet
      WHERE "assessmentId" = $1
        AND "clientId" = $2
        AND "totalScore" IS NOT NULL
        AND "deletedAt" IS NULL
      GROUP BY bucket
      `,
      [assessmentId, this.clientId],
    );

    const distribution: ScoreDistribution = {
      '90-100': 0,
      '80-89': 0,
      '70-79': 0,
      '60-69': 0,
      'below-60': 0,
    };

    for (const row of rows) {
      if (row.bucket in distribution) {
        distribution[row.bucket as keyof ScoreDistribution] = Number(row.count);
      }
    }
    return distribution;
  }

  /**
   * Returns paginated participant results for an assessment.
   */
  async getAssessmentParticipants(
    assessmentId: string,
    page: number,
    limit: number,
  ): Promise<{ rows: ParticipantResult[]; total: number }> {
    const skip = (page - 1) * limit;

    interface RawParticipantRow {
      participantId: string;
      name: string | null;
      email: string | null;
      sessionId: string;
      status: string;
      score: string | null;
      grade: string | null;
      isPassed: boolean;
      submittedAt: Date | null;
      duration: string | null;
    }

    interface RawTotal {
      total: number;
    }

    const [rows, total] = await Promise.all([
      this.dataSource.query<RawParticipantRow[]>(
        `
        SELECT
          p.id                  AS "participantId",
          p.name,
          p.email,
          sheet.id              AS "sessionId",
          sheet.status          AS status,
          sheet."totalScore"    AS score,
          sheet.grade,
          sheet."isPassed",
          sheet."submittedAt",
          ROUND(
            EXTRACT(EPOCH FROM (sheet."submittedAt" - sheet."startedAt")) / 60,
            1
          )                     AS duration
        FROM answer_sheet sheet
        JOIN assessment_participant ap ON ap.id = sheet."assessmentParticipantId"
        JOIN participant p ON p.id = ap."participantId"
        WHERE sheet."assessmentId" = $1
          AND sheet."clientId" = $2
          AND sheet."deletedAt" IS NULL
        ORDER BY sheet."totalScore" DESC NULLS LAST
        LIMIT $3 OFFSET $4
        `,
        [assessmentId, this.clientId, limit, skip],
      ),
      this.dataSource.query<RawTotal[]>(
        `
        SELECT COUNT(*)::int AS total
        FROM answer_sheet
        WHERE "assessmentId" = $1 AND "clientId" = $2 AND "deletedAt" IS NULL
        `,
        [assessmentId, this.clientId],
      ),
    ]);

    const mappedRows = rows.map((row) => ({
      participantId: row.participantId,
      name: row.name,
      email: row.email,
      sessionId: row.sessionId,
      status: row.status,
      score: row.score !== null ? Number(row.score) : null,
      grade: row.grade,
      isPassed: row.isPassed,
      duration: row.duration !== null ? Number(row.duration) : null,
      submittedAt: row.submittedAt,
    }));

    return { rows: mappedRows, total: Number(total[0]?.total ?? 0) };
  }

  // ---------------------------------------------------------------------------
  // SURVEY REPORT QUERIES
  // ---------------------------------------------------------------------------

  /**
   * Returns rating distribution per question for a survey.
   * Groups response->>'value' by assessmentQuestionId.
   */
  async getSurveyRatingDistribution(
    assessmentId: string,
  ): Promise<SurveyRatingDistribution[]> {
    interface RawRatingDistribution {
      assessmentQuestionId: string;
      rating: string;
      count: number;
      averageRating: string;
    }

    const rows = await this.dataSource.query<RawRatingDistribution[]>(
      `
      SELECT
        "assessmentQuestionId",
        rating,
        COUNT(*)::int AS count,
        "averageRating"
      FROM (
        SELECT
          ae."assessmentQuestionId",
          ae.response->>'value' AS rating,
          AVG((ae.response->>'value')::numeric) OVER (PARTITION BY ae."assessmentQuestionId") AS "averageRating"
        FROM answer_entry ae
        JOIN answer_sheet sheet ON sheet.id = ae."answerSheetId"
        JOIN assessment_question aq ON aq.id = ae."assessmentQuestionId"
        WHERE sheet."assessmentId" = $1
          AND sheet."clientId" = $2
          AND aq."questionType" = 'RATING'
          AND ae.response->>'value' IS NOT NULL
          AND ae.response->>'value' <> ''
          AND ae."deletedAt" IS NULL
          AND sheet."deletedAt" IS NULL
      ) raw_responses
      GROUP BY "assessmentQuestionId", rating, "averageRating"
      `,
      [assessmentId, this.clientId],
    );

    return rows.map((row) => ({
      assessmentQuestionId: row.assessmentQuestionId,
      rating: row.rating,
      count: Number(row.count),
      averageRating: Number(row.averageRating),
    }));
  }

  /**
   * Returns all open text responses for SHORT_ANSWER and ESSAY
   * questions in a survey — with participant name for context.
   */
  async getSurveyTextResponses(
    assessmentId: string,
  ): Promise<SurveyTextResponse[]> {
    interface RawTextResponse {
      assessmentQuestionId: string;
      participantId: string;
      participantName: string | null;
      response: string;
    }

    const rows = await this.dataSource.query<RawTextResponse[]>(
      `
      SELECT
        ae."assessmentQuestionId",
        p.id   AS "participantId",
        p.name AS "participantName",
        ae.response->>'text' AS response
      FROM answer_entry ae
      JOIN answer_sheet sheet ON sheet.id = ae."answerSheetId"
      JOIN assessment_participant ap ON ap.id = sheet."assessmentParticipantId"
      JOIN participant p ON p.id = ap."participantId"
      JOIN assessment_question aq ON aq.id = ae."assessmentQuestionId"
      WHERE sheet."assessmentId" = $1
        AND sheet."clientId" = $2
        AND aq."questionType" IN ('SHORT_ANSWER', 'ESSAY')
        AND ae.response->>'text' IS NOT NULL
        AND ae.response->>'text' <> ''
        AND ae."deletedAt" IS NULL
        AND sheet."deletedAt" IS NULL
      ORDER BY ae."assessmentQuestionId", sheet."submittedAt" ASC
      `,
      [assessmentId, this.clientId],
    );

    return rows.map((row) => ({
      assessmentQuestionId: row.assessmentQuestionId,
      participantId: row.participantId,
      name: row.participantName,
      response: row.response,
    }));
  }

  // ---------------------------------------------------------------------------
  // PARTICIPANT REPORT QUERIES
  // ---------------------------------------------------------------------------

  /**
   * Returns aggregate stats for a participant across all assessments.
   */
  async getParticipantStats(
    participantId: string,
  ): Promise<ParticipantStats | null> {
    interface RawParticipantStats {
      totalAssessmentsTaken: number;
      totalPassed: number;
      totalFailed: number;
      averageScore: string | null;
    }

    const result = await this.dataSource.query<RawParticipantStats[]>(
      `
      SELECT
        COUNT(*)::int                                           AS "totalAssessmentsTaken",
        COUNT(*) FILTER (WHERE sheet."isPassed" = true)::int   AS "totalPassed",
        COUNT(*) FILTER (WHERE sheet."isPassed" = false AND sheet.status IN ('GRADED','REQUIRES_REVIEW'))::int AS "totalFailed",
        ROUND(AVG(sheet."totalScore")::numeric, 2)             AS "averageScore"
      FROM answer_sheet sheet
      JOIN assessment_participant ap ON ap.id = sheet."assessmentParticipantId"
      WHERE ap."participantId" = $1
        AND sheet."clientId" = $2
        AND sheet."deletedAt" IS NULL
      `,
      [participantId, this.clientId],
    );

    const row = result[0];
    if (!row) return null;

    return {
      totalAssessmentsTaken: Number(row.totalAssessmentsTaken),
      totalPassed: Number(row.totalPassed),
      totalFailed: Number(row.totalFailed),
      averageScore: row.averageScore !== null ? Number(row.averageScore) : null,
    };
  }

  /**
   * Returns all assessments a participant has taken with their results.
   */
  async getParticipantAssessments(
    participantId: string,
  ): Promise<ParticipantAssessment[]> {
    interface RawParticipantAssessment {
      assessmentId: string;
      sessionId: string;
      title: string;
      type: string;
      topicTitle: string;
      score: string | null;
      maxScore: string | null;
      grade: string | null;
      isPassed: boolean;
      submittedAt: Date | null;
      duration: string | null;
    }

    const rows = await this.dataSource.query<RawParticipantAssessment[]>(
      `
      SELECT
        a.id                   AS "assessmentId",
        sheet.id               AS "sessionId",
        a.name                 AS title,
        a.type,
        t.name                 AS "topicTitle",
        sheet."totalScore"     AS score,
        aq_max.max_score       AS "maxScore",
        sheet.grade,
        sheet."isPassed",
        sheet."submittedAt",
        ROUND(
          EXTRACT(EPOCH FROM (sheet."submittedAt" - sheet."startedAt")) / 60,
          1
        )                      AS duration
      FROM answer_sheet sheet
      JOIN assessment_participant ap ON ap.id = sheet."assessmentParticipantId"
      JOIN assessment a ON a.id = sheet."assessmentId"
      JOIN topic t ON t.id = a."topicId"
      LEFT JOIN LATERAL (
        SELECT SUM(points) AS max_score
        FROM assessment_question
        WHERE "assessmentId" = a.id AND "deletedAt" IS NULL
      ) aq_max ON true
      WHERE ap."participantId" = $1
        AND sheet."clientId" = $2
        AND sheet."deletedAt" IS NULL
      ORDER BY sheet."submittedAt" DESC NULLS LAST
      `,
      [participantId, this.clientId],
    );

    return rows.map((row) => ({
      assessmentId: row.assessmentId,
      sessionId: row.sessionId,
      title: row.title,
      type: row.type,
      topicTitle: row.topicTitle,
      score: row.score !== null ? Number(row.score) : null,
      maxScore: row.maxScore !== null ? Number(row.maxScore) : null,
      grade: row.grade,
      isPassed: row.isPassed,
      submittedAt: row.submittedAt,
      duration: row.duration !== null ? Number(row.duration) : null,
    }));
  }
}
