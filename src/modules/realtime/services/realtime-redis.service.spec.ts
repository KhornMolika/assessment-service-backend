import {
  RealtimeRedisService,
  SessionState,
  RoomMember,
} from './realtime-redis.service';

describe('RealtimeRedisService', () => {
  let service: RealtimeRedisService;
  let redisMock: any;

  beforeEach(() => {
    redisMock = {
      hset: jest.fn(),
      expire: jest.fn(),
      hgetall: jest.fn(),
      hdel: jest.fn(),
      hget: jest.fn(),
      del: jest.fn(),
      keys: jest.fn(),
      hexists: jest.fn(),
      hlen: jest.fn(),
      zincrby: jest.fn(),
      zrevrange: jest.fn(),
      zrevrank: jest.fn(),
      zscore: jest.fn(),
      zcard: jest.fn(),
    };

    service = new RealtimeRedisService(redisMock);
  });

  describe('Session State', () => {
    it('should create session', async () => {
      const state: SessionState = {
        assessmentId: 'a1',
        status: 'active',
        currentQuestionId: null,
        currentQuestionIndex: 0,
        totalQuestions: 10,
        hostSocketId: 'host1',
        startedAt: 'time',
      };
      await service.createSession(state);
      expect(redisMock.hset).toHaveBeenCalledWith(
        'realtime:session:a1',
        expect.any(Object),
      );
      expect(redisMock.expire).toHaveBeenCalledWith(
        'realtime:session:a1',
        14400,
      );
    });

    it('should return null if session not found', async () => {
      redisMock.hgetall.mockResolvedValue({});
      expect(await service.getSession('a1')).toBeNull();
    });

    it('should return session state', async () => {
      redisMock.hgetall.mockResolvedValue({
        assessmentId: 'a1',
        status: 'active',
        currentQuestionIndex: '0',
        totalQuestions: '10',
        hostSocketId: 'host1',
        startedAt: 'time',
      });
      const res = await service.getSession('a1');
      expect(res?.assessmentId).toBe('a1');
      expect(res?.totalQuestions).toBe(10);
    });

    it('should update session', async () => {
      await service.updateSession('a1', { status: 'ended' });
      expect(redisMock.hset).toHaveBeenCalledWith('realtime:session:a1', {
        status: 'ended',
      });
    });

    it('should delete session', async () => {
      await service.deleteSession('a1');
      expect(redisMock.del).toHaveBeenCalledWith('realtime:session:a1');
    });
  });

  describe('Room Members', () => {
    it('should add member and name if provided', async () => {
      const member: RoomMember = {
        socketId: 's1',
        participantId: 'p1',
        role: 'participant',
        name: 'John',
      };
      await service.addMember('a1', member);
      expect(redisMock.hset).toHaveBeenCalledWith(
        'realtime:room:a1',
        's1',
        JSON.stringify(member),
      );
      expect(redisMock.hset).toHaveBeenCalledWith(
        'realtime:names:a1',
        'p1',
        'John',
      );
    });

    it('should remove member', async () => {
      await service.removeMember('a1', 's1');
      expect(redisMock.hdel).toHaveBeenCalledWith('realtime:room:a1', 's1');
    });

    it('should get members and parse them', async () => {
      redisMock.hgetall.mockResolvedValue({
        s1: JSON.stringify({ role: 'participant' }),
        s2: JSON.stringify({ role: 'host' }),
      });
      const members = await service.getMembers('a1');
      expect(members).toHaveLength(2);
      expect(members[0].role).toBe('participant');
    });

    it('should return participant count', async () => {
      redisMock.hgetall.mockResolvedValue({
        s1: JSON.stringify({ role: 'participant', participantId: 'p1' }),
        s2: JSON.stringify({ role: 'host' }),
      });
      expect(await service.getParticipantCount('a1')).toBe(1);
    });

    it('should return participant name or Anonymous', async () => {
      redisMock.hget.mockResolvedValueOnce('John').mockResolvedValueOnce(null);
      expect(await service.getName('a1', 'p1')).toBe('John');
      expect(await service.getName('a1', 'p2')).toBe('Anonymous');
    });
  });

  describe('Answers', () => {
    it('should store answer if not answered', async () => {
      redisMock.hexists.mockResolvedValue(0); // 0 means false
      const res = await service.storeAnswer('a1', 'q1', 'p1', { choice: 'A' });
      expect(res).toBe(true);
      expect(redisMock.hset).toHaveBeenCalledWith(
        'realtime:answers:a1:q1',
        'p1',
        JSON.stringify({ choice: 'A' }),
      );
    });

    it('should ignore answer if already answered', async () => {
      redisMock.hexists.mockResolvedValue(1);
      const res = await service.storeAnswer('a1', 'q1', 'p1', { choice: 'A' });
      expect(res).toBe(false);
      expect(redisMock.hset).not.toHaveBeenCalled();
    });

    it('should get answers', async () => {
      redisMock.hgetall.mockResolvedValue({
        p1: JSON.stringify({ choice: 'A' }),
      });
      const res = await service.getAnswers('a1', 'q1');
      expect(res).toEqual({ p1: { choice: 'A' } });
    });

    it('should get answer count', async () => {
      redisMock.hlen.mockResolvedValue(5);
      expect(await service.getAnswerCount('a1', 'q1')).toBe(5);
    });
  });

  describe('Scores', () => {
    it('should add score', async () => {
      await service.addScore('a1', 'p1', 10);
      expect(redisMock.zincrby).toHaveBeenCalledWith(
        'realtime:scores:a1',
        10,
        'p1',
      );
    });

    it('should get top scores', async () => {
      // redis zrevrange WITHSCORES returns ['p1', '20', 'p2', '10']
      redisMock.zrevrange.mockResolvedValue(['p1', '20', 'p2', '10']);
      const res = await service.getTopScores('a1', 2);
      expect(res).toHaveLength(2);
      expect(res[0]).toEqual({ participantId: 'p1', score: 20, rank: 1 });
      expect(res[1]).toEqual({ participantId: 'p2', score: 10, rank: 2 });
    });

    it('should get participant rank and score', async () => {
      redisMock.zrevrank.mockResolvedValue(0); // rank 1
      redisMock.zscore.mockResolvedValue('15');
      const res = await service.getParticipantRank('a1', 'p1');
      expect(res).toEqual({ rank: 1, score: 15 });
    });

    it('should get participant rank and score if missing', async () => {
      redisMock.zrevrank.mockResolvedValue(null);
      redisMock.zscore.mockResolvedValue(null);
      const res = await service.getParticipantRank('a1', 'p2');
      expect(res).toEqual({ rank: 0, score: 0 });
    });

    it('should get all scores', async () => {
      redisMock.zcard.mockResolvedValue(2);
      redisMock.zrevrange.mockResolvedValue(['p1', '20', 'p2', '10']);
      const res = await service.getAllScores('a1');
      expect(res).toHaveLength(2);
    });
  });

  describe('cleanupSession', () => {
    it('should delete all matching keys', async () => {
      redisMock.keys.mockResolvedValue(['k1', 'k2']);
      await service.cleanupSession('a1');
      expect(redisMock.del).toHaveBeenCalledWith('k1', 'k2');
    });

    it('should not delete if no keys match', async () => {
      redisMock.keys.mockResolvedValue([]);
      await service.cleanupSession('a1');
      expect(redisMock.del).not.toHaveBeenCalled();
    });
  });
});
