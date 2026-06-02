/* eslint-disable @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-return, @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-argument, @typescript-eslint/no-unused-vars */
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
import { AnswerSheetStatus } from '../../assessments/entities/answer-sheet.entity';
import { SingleChoiceStrategy } from '../../grading/strategies/single-choice.strategy';
import { MultipleChoiceStrategy } from '../../grading/strategies/multiple-choice.strategy';
import { TrueFalseStrategy } from '../../grading/strategies/true-false.strategy';
import { OrderingStrategy } from '../../grading/strategies/ordering.strategy';
import { MatchingStrategy } from '../../grading/strategies/matching.strategy';

// Points awarded per correct answer — time bonus applied on top
const BASE_POINTS = 1000;
const TIME_BONUS_MAX = 500; // extra points for fast answers

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
  };

  constructor(
    private readonly redis: RealtimeRedisService,
    private readonly assessments: AssessmentRepository,
    private readonly assessmentQuestions: AssessmentQuestionRepository,
    private readonly assessmentParticipants: AssessmentParticipantRepository,
    private readonly answerSheets: AnswerSheetRepository,
    private readonly gradingEngine: GradingEngineService,
  ) {}

  // ---------------------------------------------------------------------------
  // START SESSION (REST endpoint calls this)
  // ---------------------------------------------------------------------------

  async startSession(assessmentId: string): Promise<{
    assessmentId: string;
    status: string;
    totalQuestions: number;
  }> {
    const assessment = await this.assessments.findById(assessmentId);
    if (!assessment) throw new NotFoundException('Assessment not found');
    if (assessment.status !== AssessmentStatus.PUBLISHED) {
      throw new BadRequestException('Assessment must be published to start');
    }

    const existing = await this.redis.getSession(assessmentId);
    if (existing && existing.status !== 'ended') {
      throw new BadRequestException(
        'A session is already active for this assessment',
      );
    }

    const questions =
      await this.assessmentQuestions.findByAssessment(assessmentId);
    if (questions.length === 0) {
      throw new BadRequestException('Assessment has no questions');
    }

    await this.redis.createSession({
      assessmentId,
      status: 'waiting',
      currentQuestionId: null,
      currentQuestionIndex: -1,
      totalQuestions: questions.length,
      hostSocketId: '',
      startedAt: new Date().toISOString(),
    });

    return {
      assessmentId,
      status: 'waiting',
      totalQuestions: questions.length,
    };
  }

  // ---------------------------------------------------------------------------
  // JOIN ROOM
  // ---------------------------------------------------------------------------

  async joinRoom(
    assessmentId: string,
    socketId: string,
    participantId: string | null,
    role: 'host' | 'participant',
    name: string | null,
  ): Promise<{
    count: number;
    users: {
      id: string | null;
      name: string | null;
      status: string;
    }[];
  }> {
    const session = await this.redis.getSession(assessmentId);
    if (!session) {
      throw new NotFoundException(
        'Session not found — host must start the session first',
      );
    }

    await this.redis.addMember(assessmentId, {
      socketId,
      participantId,
      role,
      name,
    });

    if (role === 'host') {
      await this.redis.updateSession(assessmentId, { hostSocketId: socketId });
    }

    const members = await this.redis.getMembers(assessmentId);
    const participants = members.filter((m) => m.role === 'participant');

    return {
      count: participants.length,
      users: participants.map((m) => ({
        id: m.participantId,
        name: m.name,
        status: 'CONNECTED',
      })),
    };
  }

  // ---------------------------------------------------------------------------
  // START QUESTION
  // ---------------------------------------------------------------------------

  async startQuestion(
    assessmentId: string,
    socketId: string,
    questionId?: string,
  ): Promise<{
    questionNumber: number;
    totalQuestions: number;
    q: Record<string, any>;
    options: any[] | null;
    endTime: string;
  }> {
    const session = await this.redis.getSession(assessmentId);
    if (!session) throw new NotFoundException('Session not found');
    if (session.hostSocketId !== socketId) {
      throw new ForbiddenException('Only the host can start questions');
    }

    const questions =
      await this.assessmentQuestions.findByAssessment(assessmentId);

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
    await this.redis.updateSession(assessmentId, {
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
        text: snapshot.questionText,
        type: snapshot.type,
      },
      options,
      endTime,
    };
  }

  // ---------------------------------------------------------------------------
  // SUBMIT ANSWER
  // ---------------------------------------------------------------------------

  async submitAnswer(
    assessmentId: string,
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
    const session = await this.redis.getSession(assessmentId);
    if (!session) throw new NotFoundException('Session not found');
    if (session.status !== 'active') {
      throw new BadRequestException('No active question');
    }
    if (session.currentQuestionId !== assessmentQuestionId) {
      throw new BadRequestException('Answer is for a different question');
    }

    const stored = await this.redis.storeAnswer(
      assessmentId,
      assessmentQuestionId,
      participantId,
      { choice, response, timeTaken },
    );

    const totalAnswered = await this.redis.getAnswerCount(
      assessmentId,
      assessmentQuestionId,
    );
    const totalParticipants =
      await this.redis.getParticipantCount(assessmentId);

    return { stored, totalAnswered, totalParticipants };
  }

  // ---------------------------------------------------------------------------
  // END QUESTION — Q_RESULTS
  // ---------------------------------------------------------------------------

  async endQuestion(assessmentId: string): Promise<{
    questionNumber: number;
    correctAnswer: any;
    stats: {
      optionId: string;
      count: number;
    }[];
  }> {
    const session = await this.redis.getSession(assessmentId);
    if (!session || !session.currentQuestionId) {
      throw new BadRequestException('No active question to end');
    }

    const questions =
      await this.assessmentQuestions.findByAssessment(assessmentId);
    const currentAQ = questions.find((q) => q.id === session.currentQuestionId);
    if (!currentAQ) throw new NotFoundException('Current question not found');

    const snapshot = currentAQ.questionSnapshot as any;
    const correctAnswer = snapshot.correctAnswer;
    const maxScore = Number(currentAQ.points);

    // Get all answers for this question
    const answers = await this.redis.getAnswers(
      assessmentId,
      session.currentQuestionId,
    );

    // Compute distribution
    const distribution: Record<string, number> = {};
    for (const answer of Object.values(answers)) {
      const choice = answer.choice ?? 'other';
      distribution[choice] = (distribution[choice] ?? 0) + 1;
    }

    // Award scores
    for (const [participantId, answer] of Object.entries(answers)) {
      const ans = answer;
      const scoreMultiplier = this.getScoreMultiplier(
        snapshot.type,
        ans,
        correctAnswer,
      );

      if (scoreMultiplier > 0) {
        // Time bonus — faster answers get more points, scaled by correctness
        const timeBonus = ans.timeTaken
          ? Math.max(0, TIME_BONUS_MAX - Math.floor(ans.timeTaken / 100))
          : 0;
        const points = (BASE_POINTS + timeBonus) * scoreMultiplier;
        await this.redis.addScore(
          assessmentId,
          participantId,
          Math.floor(points),
        );
      }
    }

    const totalParticipants =
      await this.redis.getParticipantCount(assessmentId);

    return {
      questionNumber: session.currentQuestionIndex + 1,
      correctAnswer: this.buildCorrectAnswerPayload(
        snapshot.type,
        correctAnswer,
      ),
      stats: Object.entries(distribution).map(([optionId, count]) => ({
        optionId,
        count,
      })),
    };
  }

  // ---------------------------------------------------------------------------
  // GET RANK DATA — SHOW_RANK
  // ---------------------------------------------------------------------------

  async getRankData(assessmentId: string): Promise<{
    top5: {
      rank: number;
      id: string;
      name: string;
      score: number;
    }[];
  }> {
    const top5Raw = await this.redis.getTopScores(assessmentId, 5);
    const top5 = await Promise.all(
      top5Raw.map(async (entry) => ({
        rank: entry.rank,
        id: entry.participantId,
        name: await this.redis.getName(assessmentId, entry.participantId),
        score: entry.score,
      })),
    );

    return { top5 };
  }

  // ---------------------------------------------------------------------------
  // END SESSION — SHOW_FINAL_RANK
  // ---------------------------------------------------------------------------

  async endSession(assessmentId: string): Promise<{
    leaderboard: { id: string; name: string; score: number; rank: number }[];
  }> {
    await this.redis.updateSession(assessmentId, { status: 'ended' });

    const allScores = await this.redis.getAllScores(assessmentId);

    const leaderboard = await Promise.all(
      allScores.slice(0, 3).map(async (entry) => ({
        id: entry.participantId,
        name: await this.redis.getName(assessmentId, entry.participantId),
        score: entry.score,
        rank: entry.rank,
      })),
    );

    const sheets = await this.answerSheets.findByAssessment(assessmentId);
    for (const sheet of sheets) {
      try {
        await this.answerSheets.update(
          { id: sheet.id },
          {
            status: AnswerSheetStatus.SUBMITTED,
            submittedAt: new Date(),
          },
        );
        await this.gradingEngine.gradeSession(sheet.id);
      } catch (error) {
        this.logger.error(
          `Failed to grade sheet ${sheet.id} after session end`,
          error,
        );
      }
    }

    setTimeout(
      () => {
        this.redis.cleanupSession(assessmentId).catch(() => {});
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
    assessmentId: string,
  ): Promise<{ count: number; users: any[] }> {
    await this.redis.removeMember(assessmentId, socketId);
    const members = await this.redis.getMembers(assessmentId);
    const participants = members.filter((m) => m.role === 'participant');

    return {
      count: participants.length,
      users: participants.map((m) => ({
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

      default:
        return null;
    }
  }

  /**
   * Returns a score multiplier (0.0 to 1.0) using the Grading Strategies.
   */
  private getScoreMultiplier(
    type: string,
    answer: { choice?: string; response?: Record<string, any> },
    correctAnswer: any,
  ): number {
    if (!correctAnswer) return 0;
    const strategy = this.strategies[type as keyof typeof this.strategies];
    if (!strategy) return 0;

    let responsePayload: Record<string, any> = {};

    if (type === 'SINGLE_CHOICE') {
      responsePayload = { optionId: answer.choice };
    } else if (type === 'TRUE_FALSE') {
      // The TrueFalse strategy expects a boolean value in the payload
      responsePayload = { value: answer.choice === 'true' };
    } else if (type === 'MULTIPLE_CHOICE') {
      responsePayload = answer.response ?? {};
    } else if (type === 'ORDERING' || type === 'MATCHING') {
      responsePayload = answer.response ?? {};
    }

    try {
      const result = strategy.grade(responsePayload, correctAnswer, 1.0);
      return Math.max(0, result.scoreAwarded);
    } catch (e) {
      return 0;
    }
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
