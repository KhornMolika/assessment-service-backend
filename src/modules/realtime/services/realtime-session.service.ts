import {
  Injectable,
  Logger,
  NotFoundException,
  BadRequestException,
  ForbiddenException,
} from '@nestjs/common';
import { RealtimeRedisService } from './realtime-redis.service';
import { AssessmentRepository } from '../../assessments/repositories/assessment.repository';
import { AssessmentQuestionRepository } from '../../assessments/repositories/assessment-question.repository';
import { AssessmentParticipantRepository } from '../../assessments/repositories/assessment-participant.repository';
import { AssessmentStatus } from '../../assessments/entities/assessment.entity';
import { GradingEngineService } from '../../grading/services/grading-engine.service';
import { AnswerSheetRepository } from '../../runtime/repositories/answer-sheet.repository';
import { AnswerEntryRepository } from '../../runtime/repositories/answer-entry.repository';
import { AssessmentSettingRepository } from '../../assessments/repositories/assessment-setting.repository';
import { AnswerSheetStatus } from '../../assessments/entities/answer-sheet.entity';
import { GradingStatus } from '../../assessments/entities/answer-entry.entity';
import { SingleChoiceStrategy } from '../../grading/strategies/single-choice.strategy';
import { MultipleChoiceStrategy } from '../../grading/strategies/multiple-choice.strategy';
import { TrueFalseStrategy } from '../../grading/strategies/true-false.strategy';
import { OrderingStrategy } from '../../grading/strategies/ordering.strategy';
import { MatchingStrategy } from '../../grading/strategies/matching.strategy';
import { FillInTheBlankStrategy } from '../../grading/strategies/fill-in-the-blank.strategy';
import { WebhookService } from '../../webhooks/webhook.service';
import { QuestionType } from '../../questions/enums/question-type.enum';

const REALTIME_SPEED_BONUS_RATIO = 0.5;
const REALTIME_QUESTION_DURATION_SECONDS = 30;

function roundRealtimeScore(value: number): number {
  if (!Number.isFinite(value)) return 0;
  return Math.round(value * 100) / 100;
}

@Injectable()
export class RealtimeSessionService {
  private readonly logger = new Logger(RealtimeSessionService.name);

  // Auto-grading strategies for supported real-time question types
  private readonly strategies = {
    SINGLE_CHOICE: new SingleChoiceStrategy(),
    MULTIPLE_CHOICE: new MultipleChoiceStrategy(),
    TRUE_FALSE: new TrueFalseStrategy(),
    ORDERING: new OrderingStrategy(),
    MATCHING: new MatchingStrategy(),
    FILL_IN_THE_BLANK: new FillInTheBlankStrategy(),
  };

  constructor(
    private readonly redis: RealtimeRedisService,
    private readonly assessments: AssessmentRepository,
    private readonly assessmentQuestions: AssessmentQuestionRepository,
    private readonly assessmentParticipants: AssessmentParticipantRepository,
    private readonly answerSheets: AnswerSheetRepository,
    private readonly answerEntries: AnswerEntryRepository,
    private readonly assessmentSettings: AssessmentSettingRepository,
    private readonly gradingEngine: GradingEngineService,
    private readonly webhooks: WebhookService,
  ) {}

  // ---------------------------------------------------------------------------
  // START SESSION (REST endpoint calls this)
  // ---------------------------------------------------------------------------

  async startSession(
    assessmentId: string,
    options: boolean | { reset?: boolean; preview?: boolean } = false,
  ): Promise<{
    sessionCode: string;
    assessmentId: string;
    status: string;
    totalQuestions: number;
  }> {
    const reset = typeof options === 'boolean' ? options : !!options.reset;
    const preview = typeof options === 'boolean' ? options : !!options.preview;

    const assessment = await this.assessments.findById(assessmentId);
    if (!assessment) throw new NotFoundException('Assessment not found');
    if (assessment.status !== AssessmentStatus.PUBLISHED) {
      throw new BadRequestException('Assessment must be published to start');
    }

    // Generate a unique 6-digit session PIN
    const sessionCode = Math.floor(100000 + Math.random() * 900000).toString();

    const questions =
      await this.assessmentQuestions.findByAssessment(assessmentId);
    if (questions.length === 0) {
      throw new BadRequestException('Assessment has no questions');
    }

    await this.redis.createSession({
      sessionCode,
      assessmentId,
      clientId: assessment.clientId,
      status: 'waiting',
      currentQuestionId: null,
      currentQuestionIndex: -1,
      totalQuestions: questions.length,
      hostSocketId: '',
      startedAt: new Date().toISOString(),
      isPreview: preview,
    });

    return {
      sessionCode,
      assessmentId,
      status: 'waiting',
      totalQuestions: questions.length,
    };
  }

  async getSessionInfo(sessionCode: string) {
    const session = await this.redis.getSession(sessionCode);
    if (!session || session.status === 'ended') return null;
    
    // Fetch minimal assessment info to show on join screen
    const assessment = await this.assessments.findById(session.assessmentId);
    if (!assessment) return null;

    return {
      sessionCode: session.sessionCode,
      assessmentId: session.assessmentId,
      title: assessment.name,
      status: session.status,
    };
  }

  // ---------------------------------------------------------------------------
  // JOIN ROOM
  // ---------------------------------------------------------------------------

  async joinRoom(
    sessionCode: string,
    socketId: string,
    participantId: string | null,
    role: 'host' | 'participant',
    name: string | null,
  ): Promise<{
    count: number;
    participants: {
      id: string | null;
      name: string | null;
      status: string;
    }[];
  }> {
    const session = await this.redis.getSession(sessionCode);
    if (!session) {
      throw new NotFoundException(
        'Session not found — host must start the session first',
      );
    }

    await this.redis.addMember(sessionCode, {
      socketId,
      participantId,
      role,
      name,
    });

    if (role === 'host') {
      await this.redis.updateSession(sessionCode, { hostSocketId: socketId });
    }

    const members = await this.redis.getMembers(sessionCode);
    const uniqueParticipants = Array.from(
      new Map(
        members
          .filter((m) => m.role === 'participant' && m.participantId)
          .map((m) => [m.participantId, m]),
      ).values(),
    );

    return {
      count: uniqueParticipants.length,
      participants: uniqueParticipants.map((m) => ({
        id: m.participantId,
        name: m.name,
        status: 'CONNECTED',
      })),
    };
  }

  // ---------------------------------------------------------------------------
  // START QUESTION
  // ---------------------------------------------------------------------------

  /**
   * Starts a specific question or the next question in the sequence.
   * Only the session host can start a question.
   * Sets the session status to active and calculates the question end time.
   *
   * @param sessionCode - The ID of the assessment
   * @param socketId - The socket ID of the requester (must be host)
   * @param questionId - Optional ID of a specific question to start
   * @throws {NotFoundException} if session or question not found
   * @throws {ForbiddenException} if requester is not the host
   * @throws {BadRequestException} if no more questions available
   */
  async startQuestion(
    sessionCode: string,
    socketId: string,
    questionId?: string,
  ): Promise<{
    questionNumber: number;
    totalQuestions: number;
    q: Record<string, any>;
    options: any[] | null;
    endTime: string;
  }> {
    const session = await this.redis.getSession(sessionCode);
    if (!session) throw new NotFoundException('Session not found');
    if (!session.isPreview && session.hostSocketId !== socketId) {
      throw new ForbiddenException('Only the host can start questions');
    }
    const participantCount = await this.redis.getParticipantCount(sessionCode);
    if (participantCount === 0) {
      throw new BadRequestException(
        'At least one participant must join before the session can start',
      );
    }

    const questions =
      await this.assessmentQuestions.findByAssessment(session!.assessmentId);

    let nextIndex: number;
    let targetQuestion: any;

    if (questionId) {
      const idx = questions.findIndex((q) => q.id === questionId);
      if (idx === -1) throw new NotFoundException('Question not found');
      nextIndex = idx;
      targetQuestion = questions[idx];
    } else {
      nextIndex = session.currentQuestionIndex + 1;
      if (nextIndex >= questions.length) {
        throw new BadRequestException('No more questions');
      }
      targetQuestion = questions[nextIndex];
    }

    const snapshot = targetQuestion.questionSnapshot;
    const timeLimit = 30; // default 30s per question — could come from settings
    const endTime = new Date(Date.now() + timeLimit * 1000).toISOString();

    // Update session state
    await this.redis.updateSession(sessionCode, {
      status: 'active',
      currentQuestionId: targetQuestion.id,
      currentQuestionIndex: nextIndex,
      questionEndTime: endTime,
    });

    // Build options — strip correctAnswer
    const options = this.buildOptions(snapshot);

    return {
      questionNumber: nextIndex + 1,
      totalQuestions: questions.length,
      q: {
        id: targetQuestion.id,
        assessmentQuestionId: targetQuestion.id,
        questionText: snapshot.questionText,
        type: snapshot.type,
        difficulty: snapshot.difficulty,
        points: targetQuestion.points,
      },
      options,
      endTime,
    };
  }

  // ---------------------------------------------------------------------------
  // SUBMIT ANSWER
  // ---------------------------------------------------------------------------

  /**
   * Stores a participant's answer to the currently active question.
   * Returns tracking metrics (totalAnswered, totalParticipants).
   *
   * @param sessionCode - The ID of the assessment session
   * @param participantId - The ID of the participant submitting the answer
   * @param assessmentQuestionId - The ID of the question being answered
   * @param choice - Optional selected option ID (for choice-based questions)
   * @param response - Optional arbitrary JSON response (for complex questions)
   * @param timeTaken - Optional time taken in milliseconds (used for time bonus)
   * @throws {NotFoundException} if session not found
   * @throws {BadRequestException} if session is not active or wrong question
   */
  async submitAnswer(
    sessionCode: string,
    participantId: string,
    assessmentQuestionId: string,
    choice?: string,
    response?: Record<string, any>,
    timeTaken?: number,
  ): Promise<{
    stored: boolean;
    totalAnswered: number;
    totalParticipants: number;
  }> {
    const session = await this.redis.getSession(sessionCode);
    if (!session) throw new NotFoundException('Session not found');
    if (session.status !== 'active') {
      throw new BadRequestException('No active question');
    }
    if (session.currentQuestionId !== assessmentQuestionId) {
      throw new BadRequestException('Answer is for a different question');
    }

    const stored = await this.redis.storeAnswer(
      sessionCode,
      assessmentQuestionId,
      participantId,
      { choice, response, timeTaken },
    );

    const totalAnswered = await this.redis.getAnswerCount(
      sessionCode,
      assessmentQuestionId,
    );
    const totalParticipants =
      await this.redis.getParticipantCount(sessionCode);

    return { stored, totalAnswered, totalParticipants };
  }

  // ---------------------------------------------------------------------------
  // END QUESTION — Q_RESULTS
  // ---------------------------------------------------------------------------

  async endQuestion(sessionCode: string): Promise<{
    alreadyEnded?: boolean;
    questionId: string;
    questionNumber: number;
    correctAnswer: any;
    stats: {
      optionId: string;
      count: number;
    }[];
    totalAnswered?: number;
    totalParticipants?: number;
    participantResults: Record<
      string,
      {
        questionId: string;
        correct: boolean;
        pointsEarned: number;
        speedBonus: number;
        totalScore: number;
      }
    >;
  }> {
    const session = await this.redis.getSession(sessionCode);
    if (!session || !session.currentQuestionId) {
      throw new BadRequestException('No active question to end');
    }
    if (session.status !== 'active') {
      return {
        alreadyEnded: true,
        questionId: session.currentQuestionId,
        questionNumber: session.currentQuestionIndex + 1,
        correctAnswer: null,
        stats: [],
        totalAnswered: 0,
        totalParticipants: 0,
        participantResults: {},
      };
    }

    const claimedEnd = await this.redis.claimQuestionEnd(
      sessionCode,
      session.currentQuestionId,
    );
    if (!claimedEnd) {
      return {
        alreadyEnded: true,
        questionId: session.currentQuestionId,
        questionNumber: session.currentQuestionIndex + 1,
        correctAnswer: null,
        stats: [],
        totalAnswered: 0,
        totalParticipants: 0,
        participantResults: {},
      };
    }

    const questions =
      await this.assessmentQuestions.findByAssessment(session!.assessmentId);
    const currentAQ = questions.find((q) => q.id === session.currentQuestionId);
    if (!currentAQ) throw new NotFoundException('Current question not found');

    const snapshot = currentAQ.questionSnapshot as any;
    const correctAnswer = snapshot.correctAnswer;
    const maxScore = Number(currentAQ.points);

    // Get all answers for this question
    const answers = await this.redis.getAnswers(
      sessionCode,
      session.currentQuestionId,
    );

    // Compute distribution. Multiple-choice responses can contain several
    // option ids, so each selected option should receive one vote.
    const distribution: Record<string, number> = {};
    for (const answer of Object.values(answers)) {
      const selectedOptionIds = this.getSelectedOptionIds(
        snapshot.type,
        answer,
      );
      if (selectedOptionIds.length === 0) {
        distribution.other = (distribution.other ?? 0) + 1;
        continue;
      }

      for (const optionId of selectedOptionIds) {
        distribution[optionId] = (distribution[optionId] ?? 0) + 1;
      }
    }

    // Award scores
    const participantResults: Record<
      string,
      {
        questionId: string;
        correct: boolean;
        pointsEarned: number;
        speedBonus: number;
        totalScore: number;
      }
    > = {};
    for (const [participantId, answer] of Object.entries(answers)) {
      const ans = answer;
      const scoreMultiplier = this.getScoreMultiplier(
        snapshot.type,
        ans,
        correctAnswer,
      );
      const hasScore = scoreMultiplier > 0;
      const isFullyCorrect = scoreMultiplier >= 1;

      const questionPoints = Number.isFinite(maxScore) ? maxScore : 0;
      const timeTakenSeconds = Number(
        ans.timeTaken ?? REALTIME_QUESTION_DURATION_SECONDS,
      );
      const timeRatio = Math.max(
        0,
        1 -
          Math.min(timeTakenSeconds, REALTIME_QUESTION_DURATION_SECONDS) /
            REALTIME_QUESTION_DURATION_SECONDS,
      );
      const rawSpeedBonus =
        questionPoints *
        REALTIME_SPEED_BONUS_RATIO *
        timeRatio *
        scoreMultiplier;
      const rawPoints = questionPoints * scoreMultiplier + rawSpeedBonus;
      const speedBonus = hasScore ? roundRealtimeScore(rawSpeedBonus) : 0;
      const pointsEarned = hasScore ? roundRealtimeScore(rawPoints) : 0;

      if (pointsEarned > 0) {
        await this.redis.addScore(sessionCode, participantId, pointsEarned);
      }

      const rankAfterQuestion = await this.redis.getParticipantRank(
        sessionCode,
        participantId,
      );

      participantResults[participantId] = {
        questionId: session.currentQuestionId,
        correct: isFullyCorrect,
        pointsEarned,
        speedBonus,
        totalScore: roundRealtimeScore(rankAfterQuestion.score),
      };
    }

    const totalParticipants =
      await this.redis.getParticipantCount(sessionCode);

    const result = {
      questionId: session.currentQuestionId,
      questionNumber: session.currentQuestionIndex + 1,
      correctAnswer: this.buildCorrectAnswerPayload(
        snapshot.type,
        correctAnswer,
      ),
      stats: Object.entries(distribution).map(([optionId, count]) => ({
        optionId,
        count,
      })),
      totalAnswered: Object.keys(answers).length,
      totalParticipants,
      participantResults,
    };

    await this.redis.updateSession(sessionCode, { status: 'revealed' });

    return result;
  }

  // ---------------------------------------------------------------------------
  // GET RANK DATA — SHOW_RANK
  // ---------------------------------------------------------------------------

  async getRankData(sessionCode: string): Promise<{
    top5: {
      rank: number;
      id: string;
      name: string;
      score: number;
    }[];
  }> {
    const [topScoresRaw, members] = await Promise.all([
      this.redis.getTopScores(sessionCode, 5),
      this.redis.getMembers(sessionCode),
    ]);
    const participantMembers = Array.from(
      new Map(
        members
          .filter(
            (member) => member.role === 'participant' && member.participantId,
          )
          .map((member) => [member.participantId, member]),
      ).values(),
    );
    const scoreByParticipant = new Map(
      topScoresRaw.map((entry) => [entry.participantId, entry.score]),
    );

    const ranked = await Promise.all(
      participantMembers.map(async (member) => ({
        id: member.participantId as string,
        name:
          member.name ||
          (await this.redis.getName(
            sessionCode,
            member.participantId as string,
          )),
        score: scoreByParticipant.get(member.participantId as string) ?? 0,
      })),
    );

    const top5 = ranked
      .sort((a, b) => b.score - a.score || a.name.localeCompare(b.name))
      .slice(0, 5)
      .map((entry, index) => ({
        ...entry,
        rank: index + 1,
      }));

    return { top5 };
  }

  // ---------------------------------------------------------------------------
  // END SESSION — SHOW_FINAL_RANK
  // ---------------------------------------------------------------------------

  async endSession(sessionCode: string): Promise<{
    leaderboard: { id: string; name: string; score: number; rank: number }[];
  }> {
    const session = await this.redis.getSession(sessionCode);
    await this.redis.updateSession(sessionCode, { status: 'ended' });

    const allScores = await this.redis.getAllScores(sessionCode);

    const leaderboard = await Promise.all(
      allScores.map(async (entry) => ({
        id: entry.participantId,
        name: await this.redis.getName(sessionCode, entry.participantId),
        score: entry.score,
        rank: entry.rank,
      })),
    );

    if (session?.isPreview) {
      await this.redis.cleanupSession(sessionCode);
      return { leaderboard };
    }

    // FLUSH REDIS TO POSTGRESQL FOR REPORTS
    try {
      const assessment = await this.assessments.findById(session!.assessmentId);
      const settings =
        await this.assessmentSettings.findByAssessment(session!.assessmentId);
      const questions =
        await this.assessmentQuestions.findByAssessment(session!.assessmentId);

      const clientId = assessment?.clientId;
      const passMark = settings?.passMark ?? null;
      const gradeLabels = (settings?.gradeLabels as any[]) ?? [];

      const totalMaxScore = questions.reduce(
        (acc, q) => acc + Number(q.points ?? 0),
        0,
      );

      // Pre-fetch all answers for all questions in this session
      const answersByQuestion: Record<string, Record<string, any>> = {};
      for (const q of questions) {
        answersByQuestion[q.id] = await this.redis.getAnswers(
          sessionCode,
          q.id,
        );
      }

      for (const entry of allScores) {
        if (!entry.participantId) continue;
        const participantId = entry.participantId;
        const totalScore = entry.score;

        const scorePercent =
          totalMaxScore > 0 ? (totalScore / totalMaxScore) * 100 : 0;
        const isPassed = passMark !== null ? scorePercent >= passMark : false;

        let gradeLabel = null;
        if (gradeLabels.length > 0) {
          const sorted = [...gradeLabels].sort((a, b) => b.min - a.min);
          const matched = sorted.find((g) => scorePercent >= g.min);
          if (matched) gradeLabel = matched.name;
        }

        // Create the AnswerSheet
        const sheet = await this.answerSheets.save({
          clientId,
          sessionCode,
          assessmentParticipantId: participantId, // Expects valid UUID from db
          status: AnswerSheetStatus.GRADED,
          totalScore,
          isPassed,
          grade: gradeLabel,
          startedAt: new Date(),
          submittedAt: new Date(),
        } as any);

        // Create AnswerEntries for this participant
        for (const q of questions) {
          const pAnswer = answersByQuestion[q.id]?.[participantId];
          if (!pAnswer) continue; // participant didn't answer this question

          let responsePayload: Record<string, any> = {};
          if (q.questionSnapshot?.type === QuestionType.SINGLE_CHOICE) {
            responsePayload = { optionId: pAnswer.choice };
          } else if (q.questionSnapshot?.type === QuestionType.TRUE_FALSE) {
            responsePayload = { value: pAnswer.choice === 'true' };
          } else {
            responsePayload = pAnswer.response ?? {};
          }

          // We must calculate purely what portion of points they earned for report display
          const scoreMultiplier = this.getScoreMultiplier(
            q.questionSnapshot?.type ?? '',
            pAnswer,
            q.questionSnapshot?.correctAnswer,
          );
          const questionPoints = Number.isFinite(Number(q.points))
            ? Number(q.points)
            : 0;
          const timeTakenSeconds = Number(
            pAnswer.timeTaken ?? REALTIME_QUESTION_DURATION_SECONDS,
          );
          const timeRatio = Math.max(
            0,
            1 -
              Math.min(timeTakenSeconds, REALTIME_QUESTION_DURATION_SECONDS) /
                REALTIME_QUESTION_DURATION_SECONDS,
          );
          const timeBonus =
            questionPoints * REALTIME_SPEED_BONUS_RATIO * timeRatio;
          const entryScore =
            scoreMultiplier > 0
              ? Number(
                  ((questionPoints + timeBonus) * scoreMultiplier).toFixed(2),
                )
              : 0;

          await this.answerEntries.save({
            clientId,
            answerSheetId: sheet.id,
            assessmentQuestionId: q.id,
            response: responsePayload,
            gradingStatus: GradingStatus.AUTOMATIC,
            maxScore: Number(q.points),
            scoreAwarded: entryScore,
          });
        }
      }
      this.logger.log(
        `Successfully flushed Real-time session ${sessionCode} to Postgres`,
      );

      // Dispatch webhook
      await this.webhooks.dispatch(clientId, 'assessment.completed', {
        sessionCode,
        leaderboard,
      });
    } catch (error) {
      this.logger.error(
        `Failed to flush Real-time session ${sessionCode} to Postgres`,
        error,
      );
    }

    setTimeout(
      () => {
        this.redis.cleanupSession(sessionCode).catch(() => {});
      },
      30 * 60 * 1000,
    );

    return { leaderboard };
  }

  // ---------------------------------------------------------------------------
  // DISCONNECT
  // ---------------------------------------------------------------------------

  async handleDisconnect(
    socketId: string,
    sessionCode: string,
  ): Promise<{ count: number; participants: any[] }> {
    await this.redis.removeMember(sessionCode, socketId);
    const members = await this.redis.getMembers(sessionCode);
    const participants = members.filter((m) => m.role === 'participant');

    return {
      count: participants.length,
      participants: participants.map((m) => ({
        id: m.participantId,
        name: m.name,
        status: 'CONNECTED',
      })),
    };
  }

  // ---------------------------------------------------------------------------
  // PRIVATE HELPERS
  // ---------------------------------------------------------------------------

  private buildOptions(snapshot: any): any[] | null {
    const type = snapshot.type;
    const options = snapshot.options;

    if (!options) return null;

    switch (type) {
      case 'SINGLE_CHOICE':
      case 'MULTIPLE_CHOICE':
        return (Array.isArray(options) ? options : (options.options ?? [])).map(
          (o: any) => ({ id: o.id, text: o.text }),
        );

      case 'TRUE_FALSE':
        return [
          { id: 'true', text: options.trueLabel ?? 'True' },
          { id: 'false', text: options.falseLabel ?? 'False' },
        ];

      case 'ORDERING':
        return (options.items ?? options).map((o: any) => ({
          id: o.id,
          text: o.text,
        }));

      case 'MATCHING':
        return {
          leftSide: options.leftSide,
          rightSide: options.rightSide,
        } as any;

      case 'FILL_IN_THE_BLANK':
        return {
          template: options.template,
        } as any;

      case 'RATING':
        return options;

      default:
        return null;
    }
  }

  /**
   * Returns a score multiplier (0.0 to 1.0) using the Grading Strategies.
   */
  private getScoreMultiplier(
    type: string,
    answer: { choice?: string; response?: unknown },
    correctAnswer: unknown,
  ): number {
    if (!correctAnswer) return 0;
    const strategy = this.strategies[type as keyof typeof this.strategies];
    if (!strategy) return 0;

    let responsePayload: Record<string, unknown> = {};
    const correctPayload = this.normalizeCorrectAnswerPayload(
      type,
      correctAnswer,
    );

    if (type === 'SINGLE_CHOICE') {
      responsePayload = {
        optionId:
          answer.choice ??
          this.getRecordValue(answer.response, 'optionId') ??
          this.getRecordValue(answer.response, 'id') ??
          answer.response,
      };
    } else if (type === 'TRUE_FALSE') {
      // The TrueFalse strategy expects a boolean value in the payload
      const val: unknown =
        answer.choice ??
        this.getRecordValue(answer.response, 'value') ??
        answer.response;
      responsePayload = {
        value: val === true || (typeof val === 'string' && val === 'true'),
      };
    } else if (type === 'MULTIPLE_CHOICE') {
      responsePayload = {
        optionIds:
          this.extractStringArray(answer.response, [
            'optionIds',
            'correctOptionIds',
            'selectedOptionIds',
            'ids',
          ]) ?? (answer.choice ? [answer.choice] : []),
      };
    } else if (type === 'ORDERING' || type === 'MATCHING') {
      responsePayload = this.toRecord(answer.response);
    } else if (type === 'FILL_IN_THE_BLANK') {
      const resp = answer.response;
      let answersArr: string[] = [];
      if (Array.isArray(resp)) {
        answersArr = resp.map((value) => String(value));
      } else if (
        typeof resp === 'object' &&
        resp !== null &&
        Array.isArray(this.getRecordValue(resp, 'answers'))
      ) {
        answersArr = (this.getRecordValue(resp, 'answers') as unknown[]).map(
          (value) => String(value),
        );
      } else if (typeof resp === 'object' && resp !== null) {
        // e.g. { "0": "javascript", "1": "tes" }
        const len = Object.keys(resp).length;
        for (let i = 0; i < len; i++) {
          answersArr.push(String(resp[String(i)] ?? ''));
        }
      } else if (typeof resp === 'string') {
        answersArr = [resp];
      }
      responsePayload = { answers: answersArr };
    }

    try {
      const result = strategy.grade(responsePayload, correctPayload, 1.0);
      return Math.max(0, result.scoreAwarded);
    } catch {
      return 0;
    }
  }

  private getSelectedOptionIds(
    type: string,
    answer: { choice?: string; response?: unknown },
  ): string[] {
    if (type === 'MULTIPLE_CHOICE') {
      return (
        this.extractStringArray(answer.response, [
          'optionIds',
          'correctOptionIds',
          'selectedOptionIds',
          'ids',
        ]) ?? (answer.choice ? [answer.choice] : [])
      ).filter(Boolean);
    }

    if (type === 'SINGLE_CHOICE') {
      const value =
        answer.choice ??
        this.getRecordValue(answer.response, 'optionId') ??
        this.getRecordValue(answer.response, 'id') ??
        answer.response;
      return typeof value === 'string' ? [value] : [];
    }

    if (type === 'TRUE_FALSE') {
      const value =
        answer.choice ??
        this.getRecordValue(answer.response, 'value') ??
        answer.response;
      return [String(value)];
    }

    return answer.choice ? [answer.choice] : [];
  }

  private normalizeCorrectAnswerPayload(
    type: string,
    correctAnswer: unknown,
  ): Record<string, unknown> {
    if (type === 'SINGLE_CHOICE') {
      return {
        optionId:
          this.getRecordValue(correctAnswer, 'optionId') ??
          this.extractStringArray(correctAnswer, [
            'optionIds',
            'correctOptionIds',
          ])?.[0] ??
          (typeof correctAnswer === 'string' ? correctAnswer : undefined),
      };
    }

    if (type === 'MULTIPLE_CHOICE') {
      return {
        optionIds:
          this.extractStringArray(correctAnswer, [
            'optionIds',
            'correctOptionIds',
            'ids',
          ]) ?? [],
      };
    }

    if (type === 'TRUE_FALSE') {
      return {
        value: this.getRecordValue(correctAnswer, 'value') ?? correctAnswer,
      };
    }

    if (type === 'ORDERING') {
      return {
        sequence:
          this.extractStringArray(correctAnswer, ['sequence', 'optionIds']) ??
          [],
      };
    }

    if (type === 'FILL_IN_THE_BLANK') {
      const answers = this.getRecordValue(correctAnswer, 'answers');
      if (Array.isArray(answers) && answers.length > 0) {
        return {
          template: answers.map((_, i) => `[blank_${i + 1}]`).join(' '),
        };
      }
      return {};
    }

    return this.toRecord(correctAnswer);
  }

  private toRecord(value: unknown): Record<string, unknown> {
    return typeof value === 'object' && value !== null && !Array.isArray(value)
      ? (value as Record<string, unknown>)
      : {};
  }

  private getRecordValue(value: unknown, key: string): unknown {
    return this.toRecord(value)[key];
  }

  private extractStringArray(
    value: unknown,
    keys: string[],
  ): string[] | undefined {
    if (Array.isArray(value)) {
      return value.map((item) => String(item));
    }

    const record = this.toRecord(value);
    for (const key of keys) {
      const nested = record[key];
      if (Array.isArray(nested)) {
        return nested.map((item) => String(item));
      }
    }

    return undefined;
  }

  private buildCorrectAnswerPayload(type: string, correctAnswer: any): any {
    switch (type) {
      case 'SINGLE_CHOICE':
        return { optionId: correctAnswer.optionId };
      case 'MULTIPLE_CHOICE':
        return { optionIds: correctAnswer.optionIds };
      case 'TRUE_FALSE':
        return { value: correctAnswer.value };
      case 'ORDERING':
        return { sequence: correctAnswer.sequence };
      case 'MATCHING':
        return { pairs: correctAnswer.pairs };
      default:
        return null;
    }
  }
}
