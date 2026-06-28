import { Injectable, Logger } from '@nestjs/common';
import { InjectRedis } from '@nestjs-modules/ioredis';
import Redis from 'ioredis';

export interface SessionState {
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

  private sessionKey(assessmentId: string) {
    return `realtime:session:${assessmentId}`;
  }

  private endedQuestionKey(assessmentId: string, questionId: string) {
    return `realtime:ended-question:${assessmentId}:${questionId}`;
  }

  /**
   * Creates a new real-time session state in Redis.
   * Called when host starts the session via REST.
   */
  async createSession(state: SessionState): Promise<void> {
    const key = this.sessionKey(state.assessmentId);
    await this.redis.hset(key, {
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
  async getSession(assessmentId: string): Promise<SessionState | null> {
    const key = this.sessionKey(assessmentId);
    const data = await this.redis.hgetall(key);
    if (!data || !data.assessmentId) return null;

    return {
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
    assessmentId: string,
    fields: Partial<SessionState>,
  ): Promise<void> {
    const key = this.sessionKey(assessmentId);
    const update: Record<string, string> = {};
    for (const [k, v] of Object.entries(fields)) {
      if (v !== undefined) update[k] = String(v);
    }
    await this.redis.hset(key, update);
  }

  async claimQuestionEnd(
    assessmentId: string,
    questionId: string,
  ): Promise<boolean> {
    const claimed = await this.redis.set(
      this.endedQuestionKey(assessmentId, questionId),
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
  async deleteSession(assessmentId: string): Promise<void> {
    await this.redis.del(this.sessionKey(assessmentId));
  }

  // ---------------------------------------------------------------------------
  // ROOM MEMBERS
  // ---------------------------------------------------------------------------

  private roomKey(assessmentId: string) {
    return `realtime:room:${assessmentId}`;
  }

  private namesKey(assessmentId: string) {
    return `realtime:names:${assessmentId}`;
  }

  /**
   * Adds a member to the room.
   * socketId → JSON of member info.
   */
  async addMember(assessmentId: string, member: RoomMember): Promise<void> {
    const key = this.roomKey(assessmentId);
    await this.redis.hset(key, member.socketId, JSON.stringify(member));
    await this.redis.expire(key, this.TTL);

    if (member.participantId && member.name) {
      await this.redis.hset(
        this.namesKey(assessmentId),
        member.participantId,
        member.name,
      );
    }
  }

  /**
   * Removes a member from the room by socketId.
   * Called on disconnect.
   */
  async removeMember(assessmentId: string, socketId: string): Promise<void> {
    await this.redis.hdel(this.roomKey(assessmentId), socketId);
  }

  /**
   * Returns all members in the room.
   */
  async getMembers(assessmentId: string): Promise<RoomMember[]> {
    const data = await this.redis.hgetall(this.roomKey(assessmentId));
    return Object.values(data).map((v) => JSON.parse(v));
  }

  /**
   * Returns participant count (excludes host).
   */
  async getParticipantCount(assessmentId: string): Promise<number> {
    const members = await this.getMembers(assessmentId);
    return members.filter((m) => m.role === 'participant').length;
  }

  /**
   * Returns participant name by participantId.
   */
  async getName(assessmentId: string, participantId: string): Promise<string> {
    const name = await this.redis.hget(
      this.namesKey(assessmentId),
      participantId,
    );
    return name ?? 'Anonymous';
  }

  // ---------------------------------------------------------------------------
  // ANSWERS
  // ---------------------------------------------------------------------------

  private answersKey(assessmentId: string, questionId: string) {
    return `realtime:answers:${assessmentId}:${questionId}`;
  }

  /**
   * Stores a participant's answer for the current question.
   * Ignores if participant already answered (first answer wins).
   * Returns false if already answered, true if stored.
   */
  async storeAnswer(
    assessmentId: string,
    questionId: string,
    participantId: string,
    answer: {
      choice?: string;
      response?: Record<string, any>;
      timeTaken?: number;
    },
  ): Promise<boolean> {
    const key = this.answersKey(assessmentId, questionId);
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
    assessmentId: string,
    questionId: string,
  ): Promise<Record<string, any>> {
    const data = await this.redis.hgetall(
      this.answersKey(assessmentId, questionId),
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
    assessmentId: string,
    questionId: string,
  ): Promise<number> {
    return this.redis.hlen(this.answersKey(assessmentId, questionId));
  }

  // ---------------------------------------------------------------------------
  // SCORES (SORTED SET — LEADERBOARD)
  // ---------------------------------------------------------------------------

  private scoresKey(assessmentId: string) {
    return `realtime:scores:${assessmentId}`;
  }

  /**
   * Adds points to a participant's score.
   * Uses ZINCRBY — atomic increment.
   */
  async addScore(
    assessmentId: string,
    participantId: string,
    points: number,
  ): Promise<void> {
    await this.redis.zincrby(
      this.scoresKey(assessmentId),
      points,
      participantId,
    );
  }

  /**
   * Returns top N participants by score (descending).
   * Used for SHOW_RANK and SHOW_FINAL_RANK.
   */
  async getTopScores(
    assessmentId: string,
    count: number = 5,
  ): Promise<{ participantId: string; score: number; rank: number }[]> {
    const data = await this.redis.zrevrange(
      this.scoresKey(assessmentId),
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
    assessmentId: string,
    participantId: string,
  ): Promise<{ rank: number; score: number }> {
    const [rank, score] = await Promise.all([
      this.redis.zrevrank(this.scoresKey(assessmentId), participantId),
      this.redis.zscore(this.scoresKey(assessmentId), participantId),
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
    assessmentId: string,
  ): Promise<{ participantId: string; score: number; rank: number }[]> {
    const total = await this.redis.zcard(this.scoresKey(assessmentId));
    return this.getTopScores(assessmentId, total);
  }

  /**
   * Cleans up all Redis keys for a session.
   */
  async cleanupSession(assessmentId: string): Promise<void> {
    const keys = await this.redis.keys(`realtime:*:${assessmentId}*`);
    if (keys.length > 0) {
      await this.redis.del(...keys);
    }
  }
}
