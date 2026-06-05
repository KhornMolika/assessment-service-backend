import { Test, TestingModule } from '@nestjs/testing';
import { RealtimeGateway } from './realtime.gateway';
import { RealtimeSessionService } from '../services/realtime-session.service';
import { RealtimeEvents } from '../constants/realtime.events';
import { RoomRole } from '../dto/join-room.dto';
import { WsClientContextInterceptor } from '../../../common/interceptors/ws-client-context.interceptor';

describe('RealtimeGateway', () => {
  let gateway: RealtimeGateway;
  let sessionServiceMock: any;
  let serverMock: any;
  let socketMock: any;

  beforeEach(async () => {
    sessionServiceMock = {
      joinRoom: jest.fn(),
      startQuestion: jest.fn(),
      submitAnswer: jest.fn(),
      endQuestion: jest.fn(),
      getRankData: jest.fn(),
      endSession: jest.fn(),
      handleDisconnect: jest.fn(),
      redis: {
        getSession: jest.fn(),
        getMembers: jest.fn(),
        getParticipantRank: jest.fn(),
      },
      assessmentQuestions: {
        findByAssessment: jest.fn(),
      },
      buildOptions: jest.fn(),
    };

    serverMock = {
      to: jest.fn().mockReturnThis(),
      emit: jest.fn(),
    };

    socketMock = {
      id: 'socket-1',
      join: jest.fn(),
      emit: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        RealtimeGateway,
        { provide: RealtimeSessionService, useValue: sessionServiceMock },
      ],
    })
      .overrideInterceptor(WsClientContextInterceptor)
      .useValue({ intercept: jest.fn((context, next) => next.handle()) }) // mock interceptor
      .compile();

    gateway = module.get<RealtimeGateway>(RealtimeGateway);
    (gateway as any).server = serverMock;
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(gateway).toBeDefined();
  });

  describe('handleJoinRoom', () => {
    it('should join room and emit update', async () => {
      sessionServiceMock.joinRoom.mockResolvedValue({
        count: 1,
        participants: [],
      });
      sessionServiceMock.redis.getSession.mockResolvedValue(null);

      await gateway.handleJoinRoom(socketMock, {
        roomId: 'room-1',
        role: RoomRole.HOST,
      });

      expect(socketMock.join).toHaveBeenCalledWith('room-1');
      expect(sessionServiceMock.joinRoom).toHaveBeenCalledWith(
        'room-1',
        'socket-1',
        null,
        RoomRole.HOST,
        null,
      );
      expect(serverMock.to).toHaveBeenCalledWith('room-1');
      expect(serverMock.emit).toHaveBeenCalledWith(RealtimeEvents.ROOM_UPDATE, {
        count: 1,
        participants: [],
      });
    });

    it('should handle errors and emit ERROR event', async () => {
      sessionServiceMock.joinRoom.mockRejectedValue(new Error('Test error'));
      await gateway.handleJoinRoom(socketMock, {
        roomId: 'room-1',
        role: RoomRole.HOST,
      });
      expect(socketMock.emit).toHaveBeenCalledWith(RealtimeEvents.ERROR, {
        event: RealtimeEvents.JOIN_ROOM,
        message: 'Test error',
      });
    });
  });

  describe('handleStartQuestion', () => {
    it('should throw error if not in room', async () => {
      await gateway.handleStartQuestion(socketMock, { questionId: 'q1' });
      expect(socketMock.emit).toHaveBeenCalledWith(RealtimeEvents.ERROR, {
        event: RealtimeEvents.START_Q,
        message: 'Not in a room',
      });
    });

    it('should start question and emit NEW_QUESTION', async () => {
      (gateway as any).socketRooms.set('socket-1', 'room-1');
      sessionServiceMock.redis.getSession.mockResolvedValue(null);
      sessionServiceMock.startQuestion.mockResolvedValue({
        questionNumber: 1,
        totalQuestions: 5,
      });

      await gateway.handleStartQuestion(socketMock, { questionId: 'q1' });

      expect(sessionServiceMock.startQuestion).toHaveBeenCalledWith(
        'room-1',
        'socket-1',
        'q1',
      );
      expect(serverMock.to).toHaveBeenCalledWith('room-1');
      expect(serverMock.emit).toHaveBeenCalledWith(
        RealtimeEvents.NEW_QUESTION,
        { questionNumber: 1, totalQuestions: 5 },
      );
    });

    it('should end session if no more questions', async () => {
      (gateway as any).socketRooms.set('socket-1', 'room-1');
      sessionServiceMock.redis.getSession.mockResolvedValue(null);
      sessionServiceMock.startQuestion.mockRejectedValue(
        new Error('No more questions'),
      );
      sessionServiceMock.endSession.mockResolvedValue({ leaderboard: [] });

      await gateway.handleStartQuestion(socketMock, { questionId: 'q1' });

      expect(sessionServiceMock.endSession).toHaveBeenCalledWith('room-1');
      expect(serverMock.to).toHaveBeenCalledWith('room-1');
      expect(serverMock.emit).toHaveBeenCalledWith(
        RealtimeEvents.SHOW_FINAL_RANK,
        [],
      );
    });
  });

  describe('handleRevealAnswers', () => {
    it('should error if not host', async () => {
      (gateway as any).socketRooms.set('socket-1', 'room-1');
      sessionServiceMock.redis.getSession.mockResolvedValue({
        hostSocketId: 'other-socket',
      });

      await gateway.handleRevealAnswers(socketMock);
      expect(socketMock.emit).toHaveBeenCalledWith(RealtimeEvents.ERROR, {
        event: RealtimeEvents.REVEAL_ANSWERS,
        message: 'Only the host can reveal answers',
      });
    });
  });

  describe('handleSubmitAnswer', () => {
    it('should error if not in room', async () => {
      await gateway.handleSubmitAnswer(socketMock, {
        choice: 'A',
        response: null,
        timeTaken: 10,
      });
      expect(socketMock.emit).toHaveBeenCalledWith(RealtimeEvents.ERROR, {
        event: RealtimeEvents.SUBMIT_ANS,
        message: 'Not in a room',
      });
    });

    it('should error if participant not found in room', async () => {
      (gateway as any).socketRooms.set('socket-1', 'room-1');
      sessionServiceMock.redis.getMembers.mockResolvedValue([]);

      await gateway.handleSubmitAnswer(socketMock, {
        choice: 'A',
        response: null,
        timeTaken: 10,
      });
      expect(socketMock.emit).toHaveBeenCalledWith(RealtimeEvents.ERROR, {
        event: RealtimeEvents.SUBMIT_ANS,
        message: 'Participant not found in room',
      });
    });

    it('should submit answer successfully', async () => {
      (gateway as any).socketRooms.set('socket-1', 'room-1');
      sessionServiceMock.redis.getMembers.mockResolvedValue([
        { socketId: 'socket-1', participantId: 'p1' },
      ]);
      sessionServiceMock.redis.getSession.mockResolvedValue({
        currentQuestionId: 'q1',
      });
      sessionServiceMock.submitAnswer.mockResolvedValue({
        stored: true,
        totalAnswered: 1,
        totalParticipants: 2,
      });

      await gateway.handleSubmitAnswer(socketMock, {
        choice: 'A',
        response: null,
        timeTaken: 10,
      });
      expect(sessionServiceMock.submitAnswer).toHaveBeenCalledWith(
        'room-1',
        'p1',
        'q1',
        'A',
        null,
        10,
      );
    });

    it('should end question if all participants answered', async () => {
      (gateway as any).socketRooms.set('socket-1', 'room-1');
      sessionServiceMock.redis.getMembers.mockResolvedValue([
        { socketId: 'socket-1', participantId: 'p1' },
      ]);
      sessionServiceMock.redis.getSession.mockResolvedValue({
        currentQuestionId: 'q1',
      });
      sessionServiceMock.submitAnswer.mockResolvedValue({
        stored: true,
        totalAnswered: 2,
        totalParticipants: 2,
      });

      // endQuestion logic
      sessionServiceMock.endQuestion.mockResolvedValue({
        stats: {},
        correctAnswer: { value: 'A' },
      });
      sessionServiceMock.getRankData.mockResolvedValue({ top5: [] });
      // overriding getMembers to return an empty array for rank sending loop to not crash
      sessionServiceMock.redis.getMembers
        .mockResolvedValueOnce([{ socketId: 'socket-1', participantId: 'p1' }])
        .mockResolvedValueOnce([]);

      await gateway.handleSubmitAnswer(socketMock, {
        choice: 'A',
        response: null,
        timeTaken: 10,
      });
      expect(sessionServiceMock.endQuestion).toHaveBeenCalledWith('room-1');
      expect(serverMock.emit).toHaveBeenCalledWith(
        RealtimeEvents.Q_RESULTS,
        expect.anything(),
      );
    });
  });

  describe('handleDisconnect', () => {
    it('should handle disconnect if in room', async () => {
      (gateway as any).socketRooms.set('socket-1', 'room-1');
      sessionServiceMock.handleDisconnect.mockResolvedValue({
        count: 0,
        participants: [],
      });

      await gateway.handleDisconnect(socketMock);

      expect(sessionServiceMock.handleDisconnect).toHaveBeenCalledWith(
        'socket-1',
        'room-1',
      );
      expect(serverMock.to).toHaveBeenCalledWith('room-1');
      expect(serverMock.emit).toHaveBeenCalledWith(RealtimeEvents.ROOM_UPDATE, {
        count: 0,
        participants: [],
      });
      expect((gateway as any).socketRooms.get('socket-1')).toBeUndefined();
    });
  });
});
