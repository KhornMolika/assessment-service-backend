import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import { io, Socket } from 'socket.io-client';
import { AppModule } from './../src/app.module';
import { RealtimeEvents } from './../src/modules/realtime/constants/realtime.events';
import { RoomRole } from './../src/modules/realtime/dto/join-room.dto';
import { IoAdapter } from '@nestjs/platform-socket.io';
import Redis from 'ioredis';

import { RealtimeSessionService } from './../src/modules/realtime/services/realtime-session.service';

describe('RealtimeGateway (e2e)', () => {
  let app: INestApplication;
  let hostSocket: Socket;
  let participantSocket: Socket;
  let serverUrl: string;
  let redisClient: Redis;
  let sessionServiceMock: Partial<RealtimeSessionService>;
  const assessmentId = 'e2e-assessment-uuid';
  const participantId = 'e2e-participant-1';

  beforeAll(async () => {
    redisClient = new Redis({
      host: process.env.REDIS_HOST || 'localhost',
      port: Number(process.env.REDIS_PORT) || 6379,
    });

    sessionServiceMock = {
      redis: {
        getSession: jest.fn().mockResolvedValue({ hostSocketId: 'host-socket-id', status: 'active', currentQuestionId: 'q-0' }),
        getMembers: jest.fn().mockResolvedValue([{ socketId: 'test-participant-socket', role: 'participant', participantId }]),
        getParticipantRank: jest.fn().mockResolvedValue({ rank: 1, score: 1000 }),
      } as any,
      joinRoom: jest.fn().mockResolvedValue({
        count: 1,
        participants: [],
      }),
      startQuestion: jest.fn().mockResolvedValue({ questionNumber: 1, totalQuestions: 5 }),
      revealAnswers: jest.fn().mockResolvedValue(true),
      submitAnswer: jest.fn().mockResolvedValue({ totalAnswered: 1, totalParticipants: 1 }),
      endQuestion: jest.fn().mockResolvedValue({ correctAnswer: { optionId: 'A' }, stats: {} }),
      getRankData: jest.fn().mockResolvedValue({ leaderboard: [] }),
    };

    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    })
      .overrideProvider(RealtimeSessionService)
      .useValue(sessionServiceMock)
      .compile();

    app = moduleFixture.createNestApplication();
    app.useWebSocketAdapter(new IoAdapter(app));
    await app.init();
    await app.listen(0);
    
    const server = app.getHttpServer();
    const port = server.address().port;
    serverUrl = `http://127.0.0.1:${port}/realtime`;
  });

  afterAll(async () => {
    if (hostSocket) hostSocket.disconnect();
    if (participantSocket) participantSocket.disconnect();
    await redisClient.disconnect();
    await app.close();
  });

  afterEach(async () => {
    if (hostSocket) hostSocket.removeAllListeners();
    if (participantSocket) participantSocket.removeAllListeners();
  });

  beforeEach(async () => {
    // Clean up Redis before each test
    const keys = await redisClient.keys(`realtime:*`);
    if (keys.length > 0) {
      await redisClient.del(...keys);
    }
  });

  it('should allow a host to join a room', async () => {
    hostSocket = io(serverUrl, {
      auth: { clientId: 'e2e-client' },
      transports: ['websocket'],
    });

    const connectPromise = new Promise<void>((resolve, reject) => {
      hostSocket.on('connect', () => resolve());
      hostSocket.on('connect_error', (err) => reject(new Error('Connect Error: ' + err.message)));
    });

    await connectPromise;

    const roomUpdatePromise = new Promise<any>((resolve) => {
      hostSocket.on(RealtimeEvents.ROOM_UPDATE, (data) => resolve(data));
    });

    hostSocket.emit(RealtimeEvents.JOIN_ROOM, {
      roomId: assessmentId,
      role: RoomRole.HOST,
    });

    const data = await roomUpdatePromise;
    expect(data).toBeDefined();
    expect(data.count).toBe(1);
  });

  it('should broadcast ROOM_UPDATE when a participant joins', async () => {
    sessionServiceMock.joinRoom = jest.fn().mockResolvedValue({
      count: 2,
      participants: [{ id: participantId, name: 'Test User', status: 'connected' }],
    });

    participantSocket = io(serverUrl, {
      auth: { clientId: 'e2e-client' },
      transports: ['websocket'],
    });

    const connectPromise = new Promise<void>((resolve, reject) => {
      participantSocket.on('connect', () => resolve());
      participantSocket.on('connect_error', (err) => reject(new Error('Connect Error: ' + err.message)));
    });

    await connectPromise;

    const roomUpdatePromise = new Promise<any>((resolve) => {
      hostSocket.on(RealtimeEvents.ROOM_UPDATE, (data) => resolve(data));
    });

    participantSocket.emit(RealtimeEvents.JOIN_ROOM, {
      roomId: assessmentId,
      role: RoomRole.PARTICIPANT,
      participantId: participantId,
    });

    const data = await roomUpdatePromise;
    expect(data.count).toBe(2);
    expect(data.participants.some((p: any) => p.id === participantId)).toBe(true);
  });

  it('should start the session when host emits START_Q', async () => {
    const sessionStartedPromise = new Promise<any>((resolve) => {
      participantSocket.on(RealtimeEvents.NEW_QUESTION, (data) => resolve(data));
    });

    hostSocket.emit(RealtimeEvents.START_Q, {
      roomId: assessmentId,
      questionId: 'q-1',
      durationSeconds: 30,
    });

    const data = await sessionStartedPromise;
    expect(data.questionNumber).toBe(1);
  });

  it('should allow participant to submit an answer and broadcast RESULTS when host reveals', async () => {
    // Make sure the mock returns the actual host socket ID
    sessionServiceMock.redis.getSession = jest.fn().mockResolvedValue({
      hostSocketId: hostSocket.id,
      status: 'active',
      currentQuestionId: 'q-1',
    });

    participantSocket.emit(RealtimeEvents.SUBMIT_ANS, {
      roomId: assessmentId,
      participantId: participantId,
      questionId: 'q-1',
      answers: ['A'],
    });

    const resultsPromise = new Promise<any>((resolve) => {
      participantSocket.on(RealtimeEvents.Q_RESULTS, (data) => resolve(data));
    });

    // Wait slightly to ensure answer registered
    await new Promise((r) => setTimeout(r, 50));

    hostSocket.emit(RealtimeEvents.REVEAL_ANSWERS, {
      roomId: assessmentId,
    });

    const data = await resultsPromise;
    expect(data).toBeDefined();
  });
});
