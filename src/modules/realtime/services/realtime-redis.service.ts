import { Injectable, Logger } from '@nestjs/common';
import { InjectRedis } from '@nestjs-modules/ioredis';
import Redis from 'ioredis';

export interface SessionState {
  sessionCode: string;
  assessmentId: string;
  clientId: string;
  status: 'waiting' | 'active' | 'revealed' | 'ended';
  currentQuestionId: string | null;
  currentQuestionIndex: number;
  totalQuestions: number;
  hostSocketId: string;
  startedAt: string;
  questionEndTime?: string | null;
  isPreview?: boolean;
}

export interface RoomMember {
  socketId: string;
  participantId: string | null;
  role: 'host' | 'participant';
  name: string | null;
}

@Injectable()
export class RealtimeRedisService {
  private readonly logger = new Logger(RealtimeRedisService.name);
  private readonly TTL = 60 * 60 * 4; // 4 hours

  constructor(@InjectRedis() private readonly redis: Redis) {}

  // ---------------------------------------------------------------------------
  // SESSION STATE
  // ---------------------------------------------------------------------------

  private sessionKey(sessionCode: string) {
    return `realtime:session:${sessionCode}`;
  }

  private endedQuestionKey(sessionCode: string, questionId: string) {
    return `realtime:ended-question:${sessionCode}:${questionId}`;
  }

  /**
   * Creates a new real-time session state in Redis.
   * Called when host starts the session via REST.
   */
  async createSession(state: SessionState): Promise<void> {
    const key = this.sessionKey(state.sessionCode);
    await this.redis.hset(key, {
      sessionCode: state.sessionCode,
      assessmentId: state.assessmentId,
      clientId: state.clientId,
      status: state.status,
      currentQuestionId: state.currentQuestionId ?? '',
      currentQuestionIndex: String(state.currentQuestionIndex),
      totalQuestions: String(state.totalQuestions),
      hostSocketId: state.hostSocketId,
      startedAt: state.startedAt,
      questionEndTime: state.questionEndTime ?? '',
      isPreview: state.isPreview ? 'true' : 'false',
    });
    await this.redis.expire(key, this.TTL);
  }

  /**
   * Returns current session state.
   * Returns null if session does not exist.
   */
  async getSession(sessionCode: string): Promise<SessionState | null> {
    const key = this.sessionKey(sessionCode);
    const data = await this.redis.hgetall(key);
    if (!data || !data.assessmentId) return null;

    return {
      sessionCode: data.sessionCode || sessionCode,
      assessmentId: data.assessmentId,
      clientId: data.clientId,
      status: data.status as SessionState['status'],
      currentQuestionId: data.currentQuestionId || null,
      currentQuestionIndex: Number(data.currentQuestionIndex),
      totalQuestions: Number(data.totalQuestions),
      hostSocketId: data.hostSocketId,
      startedAt: data.startedAt,
      questionEndTime: data.questionEndTime || null,
      isPreview: data.isPreview === 'true',
    };
  }

  /**
   * Updates specific fields of the session state.
   */
  async updateSession(
    sessionCode: string,
    fields: Partial<SessionState>,
  ): Promise<void> {
    const key = this.sessionKey(sessionCode);
    const update: Record<string, string> = {};
    for (const [k, v] of Object.entries(fields)) {
      if (v !== undefined) update[k] = String(v);
    }
    await this.redis.hset(key, update);
  }

  async claimQuestionEnd(
    sessionCode: string,
    questionId: string,
  ): Promise<boolean> {
    const claimed = await this.redis.set(
      this.endedQuestionKey(sessionCode, questionId),
      '1',
      'EX',
      this.TTL,
      'NX',
    );
    return claimed === 'OK';
  }

  /**
   * Deletes the session from Redis.
   * Called when session ends.
   */
  async deleteSession(sessionCode: string): Promise<void> {
    await this.redis.del(this.sessionKey(sessionCode));
  }

  // ---------------------------------------------------------------------------
  // ROOM MEMBERS
  // ---------------------------------------------------------------------------

  private roomKey(sessionCode: string) {
    return `realtime:room:${sessionCode}`;
  }

  private namesKey(sessionCode: string) {
    return `realtime:names:${sessionCode}`;
  }

  /**
   * Adds a member to the room.
   * socketId → JSON of member info.
   */
  async addMember(sessionCode: string, member: RoomMember): Promise<void> {
    const key = this.roomKey(sessionCode);
    await this.redis.hset(key, member.socketId, JSON.stringify(member));
    await this.redis.expire(key, this.TTL);

    if (member.participantId && member.name) {
      await this.redis.hset(
        this.namesKey(sessionCode),
        member.participantId,
        member.name,
      );
    }
  }

  /**
   * Removes a member from the room by socketId.
   * Called on disconnect.
   */
  async removeMember(sessionCode: string, socketId: string): Promise<void> {
    await this.redis.hdel(this.roomKey(sessionCode), socketId);
  }

  /**
   * Returns all members in the room.
   */
  async getMembers(sessionCode: string): Promise<RoomMember[]> {
    const data = await this.redis.hgetall(this.roomKey(sessionCode));
    return Object.values(data).map((v) => JSON.parse(v));
  }

  /**
   * Returns participant count (excludes host).
   */
  async getParticipantCount(sessionCode: string): Promise<number> {
    const members = await this.getMembers(sessionCode);
    const uniqueParticipants = new Set(
      members
        .filter((m) => m.role === 'participant' && m.participantId)
        .map((m) => m.participantId),
    );
    return uniqueParticipants.size;
  }

  /**
   * Returns participant name by participantId.
   */
  async getName(sessionCode: string, participantId: string): Promise<string> {
    const name = await this.redis.hget(
      this.namesKey(sessionCode),
      participantId,
    );
    return name ?? 'Anonymous';
  }

  // ---------------------------------------------------------------------------
  // ANSWERS
  // ---------------------------------------------------------------------------

  private answersKey(sessionCode: string, questionId: string) {
    return `realtime:answers:${sessionCode}:${questionId}`;
  }

  /**
   * Stores a participant's answer for the current question.
   * Ignores if participant already answered (first answer wins).
   * Returns false if already answered, true if stored.
   */
  async storeAnswer(
    sessionCode: string,
    questionId: string,
    participantId: string,
    answer: {
      choice?: string;
      response?: Record<string, any>;
      timeTaken?: number;
    },
  ): Promise<boolean> {
    const key = this.answersKey(sessionCode, questionId);
    const exists = await this.redis.hexists(key, participantId);
    if (exists) return false; // already answered — ignore

    await this.redis.hset(key, participantId, JSON.stringify(answer));
    await this.redis.expire(key, this.TTL);
    return true;
  }

  /**
   * Returns all answers for a question.
   * Used to compute stats for Q_RESULTS.
   */
  async getAnswers(
    sessionCode: string,
    questionId: string,
  ): Promise<Record<string, any>> {
    const data = await this.redis.hgetall(
      this.answersKey(sessionCode, questionId),
    );
    const result: Record<string, any> = {};
    for (const [participantId, v] of Object.entries(data)) {
      result[participantId] = JSON.parse(v);
    }
    return result;
  }

  /**
   * Returns count of participants who answered a question.
   */
  async getAnswerCount(
    sessionCode: string,
    questionId: string,
  ): Promise<number> {
    return this.redis.hlen(this.answersKey(sessionCode, questionId));
  }

  // ---------------------------------------------------------------------------
  // SCORES (SORTED SET — LEADERBOARD)
  // ---------------------------------------------------------------------------

  private scoresKey(sessionCode: string) {
    return `realtime:scores:${sessionCode}`;
  }

  /**
   * Adds points to a participant's score.
   * Uses ZINCRBY — atomic increment.
   */
  async addScore(
    sessionCode: string,
    participantId: string,
    points: number,
  ): Promise<void> {
    await this.redis.zincrby(
      this.scoresKey(sessionCode),
      points,
      participantId,
    );
  }

  /**
   * Returns top N participants by score (descending).
   * Used for SHOW_RANK and SHOW_FINAL_RANK.
   */
  async getTopScores(
    sessionCode: string,
    count: number = 5,
  ): Promise<{ participantId: string; score: number; rank: number }[]> {
    const data = await this.redis.zrevrange(
      this.scoresKey(sessionCode),
      0,
      count - 1,
      'WITHSCORES',
    );

    const results: { participantId: string; score: number; rank: number }[] =
      [];
    for (let i = 0; i < data.length; i += 2) {
      results.push({
        participantId: data[i],
        score: Number(data[i + 1]),
        rank: Math.floor(i / 2) + 1,
      });
    }
    return results;
  }

  /**
   * Returns a specific participant's rank and score.
   */
  async getParticipantRank(
    sessionCode: string,
    participantId: string,
  ): Promise<{ rank: number; score: number }> {
    const [rank, score] = await Promise.all([
      this.redis.zrevrank(this.scoresKey(sessionCode), participantId),
      this.redis.zscore(this.scoresKey(sessionCode), participantId),
    ]);

    return {
      rank: rank !== null ? rank + 1 : 0,
      score: score !== null ? Number(score) : 0,
    };
  }

  /**
   * Returns all scores for final leaderboard.
   */
  async getAllScores(
    sessionCode: string,
  ): Promise<{ participantId: string; score: number; rank: number }[]> {
    const total = await this.redis.zcard(this.scoresKey(sessionCode));
    return this.getTopScores(sessionCode, total);
  }

  /**
   * Cleans up all Redis keys for a session.
   */
  async cleanupSession(sessionCode: string): Promise<void> {
    const keys = await this.redis.keys(`realtime:*:${sessionCode}*`);
    if (keys.length > 0) {
      await this.redis.del(...keys);
    }
  }
}
