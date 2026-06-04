import {
  WebSocketGateway,
  WebSocketServer,
  SubscribeMessage,
  MessageBody,
  ConnectedSocket,
  OnGatewayDisconnect,
  OnGatewayInit,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { Logger } from '@nestjs/common';
import { RealtimeSessionService } from '../services/realtime-session.service';
import { RealtimeEvents } from '../constants/realtime.events';
import { JoinRoomDto, RoomRole } from '../dto/join-room.dto';
import { StartQuestionDto } from '../dto/start-question.dto';
import { SubmitAnswerDto } from '../dto/submit-answer.dto';
import { UseInterceptors } from '@nestjs/common';
import { WsClientContextInterceptor } from '../../../common/interceptors/ws-client-context.interceptor';

@UseInterceptors(WsClientContextInterceptor)
@WebSocketGateway({
  cors: {
    origin: '*',
    credentials: true,
  },
  namespace: '/realtime',
})
export class RealtimeGateway implements OnGatewayInit, OnGatewayDisconnect {
  @WebSocketServer()
  private server!: Server;

  private readonly logger = new Logger(RealtimeGateway.name);

  // socketId → assessmentId (for disconnect handling)
  private readonly socketRooms = new Map<string, string>();

  constructor(private readonly sessionService: RealtimeSessionService) {}

  afterInit() {
    this.logger.log('RealtimeGateway initialized');
  }

  // ---------------------------------------------------------------------------
  // JOIN_ROOM
  // ---------------------------------------------------------------------------

  @SubscribeMessage(RealtimeEvents.JOIN_ROOM)
  async handleJoinRoom(
    @ConnectedSocket() socket: Socket,
    @MessageBody() dto: JoinRoomDto,
  ) {
    try {
      const assessmentId = dto.roomId;

      await socket.join(assessmentId);
      this.socketRooms.set(socket.id, assessmentId);

      const result = await this.sessionService.joinRoom(
        assessmentId,
        socket.id,
        dto.participantId ?? null,
        dto.role,
        null,
      );

      this.server.to(assessmentId).emit(RealtimeEvents.ROOM_UPDATE, {
        count: result.count,
        participants: result.participants,
      });

      this.logger.log(`${dto.role} ${socket.id} joined room ${assessmentId}`);

      // Reconnect resilience for participants
      if (dto.role === RoomRole.PARTICIPANT) {
        const session =
          await this.sessionService['redis'].getSession(assessmentId);
        if (
          session &&
          session.status === 'active' &&
          session.currentQuestionId
        ) {
          const endTimeStr = session.questionEndTime;
          const endTime = endTimeStr ? new Date(endTimeStr).getTime() : 0;
          const now = Date.now();

          if (endTime > now) {
            // Participant joined while a question is active. Fetch current question and send only to them.
            // StartQuestion handles moving to the *next* index. To fetch the *current*, we'd ideally
            // have a 'getCurrentQuestion' method. Since we don't, we will send an abbreviated packet,
            // or re-call startQuestion which might advance it. Wait, calling startQuestion advances it.
            // We should just fetch the question directly from the DB.
            const questions =
              await this.sessionService['assessmentQuestions'].findByAssessment(
                assessmentId,
              );
            const targetQuestion = questions.find(
              (q: any) => q.id === session.currentQuestionId,
            );

            if (targetQuestion) {
              const snapshot = targetQuestion.questionSnapshot as any;
              const options = this.sessionService['buildOptions'](snapshot);

              socket.emit(RealtimeEvents.NEW_QUESTION, {
                questionNumber: session.currentQuestionIndex + 1,
                totalQuestions: session.totalQuestions,
                q: {
                  id: snapshot.id,
                  assessmentQuestionId: targetQuestion.id,
                  type: snapshot.type,
                  questionText: snapshot.questionText,
                  difficulty: snapshot.difficulty,
                  points: targetQuestion.points,
                },
                options,
                endTime: new Date(endTime).toISOString(),
              });
              this.logger.log(
                `Resent active question to reconnecting participant ${socket.id}`,
              );
            }
          }
        }
      }
    } catch (error) {
      socket.emit(RealtimeEvents.ERROR, {
        event: RealtimeEvents.JOIN_ROOM,
        message: (error as Error).message,
      });
    }
  }

  // ---------------------------------------------------------------------------
  // START_Q
  // ---------------------------------------------------------------------------

  @SubscribeMessage(RealtimeEvents.START_Q)
  async handleStartQuestion(
    @ConnectedSocket() socket: Socket,
    @MessageBody() dto: StartQuestionDto,
  ) {
    try {
      const assessmentId = this.socketRooms.get(socket.id);
      if (!assessmentId) throw new Error('Not in a room');

      const session =
        await this.sessionService['redis'].getSession(assessmentId);
      if (session?.status === 'active' && session.currentQuestionId) {
        await this.endCurrentQuestion(assessmentId);
      }

      try {
        const questionData = await this.sessionService.startQuestion(
          assessmentId,
          socket.id,
          dto.questionId,
        );

        this.server
          .to(assessmentId)
          .emit(RealtimeEvents.NEW_QUESTION, questionData);

        this.logger.log(
          `Question ${questionData.questionNumber}/${questionData.totalQuestions} started in room ${assessmentId}`,
        );
      } catch (err: any) {
        if (err.message === 'No more questions') {
          await this.endSession(assessmentId);
        } else {
          throw err;
        }
      }
    } catch (error) {
      socket.emit(RealtimeEvents.ERROR, {
        event: RealtimeEvents.START_Q,
        message: (error as Error).message,
      });
    }
  }

  // ---------------------------------------------------------------------------
  // REVEAL_ANSWERS
  // ---------------------------------------------------------------------------

  @SubscribeMessage(RealtimeEvents.REVEAL_ANSWERS)
  async handleRevealAnswers(@ConnectedSocket() socket: Socket) {
    try {
      const assessmentId = this.socketRooms.get(socket.id);
      if (!assessmentId) throw new Error('Not in a room');

      const session =
        await this.sessionService['redis'].getSession(assessmentId);
      if (session?.hostSocketId !== socket.id) {
        throw new Error('Only the host can reveal answers');
      }

      if (session?.status === 'active' && session.currentQuestionId) {
        await this.endCurrentQuestion(assessmentId);
      }
    } catch (error) {
      socket.emit(RealtimeEvents.ERROR, {
        event: RealtimeEvents.REVEAL_ANSWERS,
        message: (error as Error).message,
      });
    }
  }

  // ---------------------------------------------------------------------------
  // SUBMIT_ANS
  // ---------------------------------------------------------------------------

  @SubscribeMessage(RealtimeEvents.SUBMIT_ANS)
  async handleSubmitAnswer(
    @ConnectedSocket() socket: Socket,
    @MessageBody() dto: SubmitAnswerDto,
  ) {
    try {
      const assessmentId = this.socketRooms.get(socket.id);
      if (!assessmentId) throw new Error('Not in a room');

      const members =
        await this.sessionService['redis'].getMembers(assessmentId);
      const member = members.find((m) => m.socketId === socket.id);
      if (!member?.participantId) {
        socket.emit(RealtimeEvents.ERROR, {
          event: RealtimeEvents.SUBMIT_ANS,
          message: 'Participant not found in room',
        });
        return;
      }

      const session =
        await this.sessionService['redis'].getSession(assessmentId);
      if (!session || !session.currentQuestionId)
        throw new Error('No active question');

      const result = await this.sessionService.submitAnswer(
        assessmentId,
        member.participantId,
        session.currentQuestionId,
        dto.choice,
        dto.response,
        dto.timeTaken,
      );

      if (!result.stored) {
        return;
      }

      const hostSession =
        await this.sessionService['redis'].getSession(assessmentId);
      if (hostSession?.hostSocketId) {
        this.server
          .to(hostSession.hostSocketId)
          .emit(RealtimeEvents.ROOM_UPDATE, {
            event: 'answer:received',
            totalAnswered: result.totalAnswered,
            totalParticipants: result.totalParticipants,
          });
      }

      if (result.totalAnswered >= result.totalParticipants) {
        await this.endCurrentQuestion(assessmentId);
      }
    } catch (error) {
      socket.emit(RealtimeEvents.ERROR, {
        event: RealtimeEvents.SUBMIT_ANS,
        message: (error as Error).message,
      });
    }
  }

  // ---------------------------------------------------------------------------
  // DISCONNECT
  // ---------------------------------------------------------------------------

  async handleDisconnect(socket: Socket) {
    const assessmentId = this.socketRooms.get(socket.id);
    if (!assessmentId) return;

    try {
      const result = await this.sessionService.handleDisconnect(
        socket.id,
        assessmentId,
      );

      this.server.to(assessmentId).emit(RealtimeEvents.ROOM_UPDATE, {
        count: result.count,
        participants: result.participants,
      });

      this.socketRooms.delete(socket.id);
    } catch {
      // Session may already be ended
    }
  }

  // ---------------------------------------------------------------------------
  // PRIVATE HELPERS
  // ---------------------------------------------------------------------------

  private async endCurrentQuestion(assessmentId: string): Promise<void> {
    try {
      const results = await this.sessionService.endQuestion(assessmentId);

      let correctStr = '';
      if (results.correctAnswer) {
        correctStr =
          results.correctAnswer.optionId ||
          results.correctAnswer.value?.toString() ||
          JSON.stringify(results.correctAnswer);
      }

      this.server.to(assessmentId).emit(RealtimeEvents.Q_RESULTS, {
        correct: correctStr,
        stats: results.stats,
      });

      const rankData = await this.sessionService.getRankData(assessmentId);
      const members =
        await this.sessionService['redis'].getMembers(assessmentId);

      for (const member of members) {
        if (member.role === 'participant' && member.participantId) {
          const myRank = await this.sessionService['redis'].getParticipantRank(
            assessmentId,
            member.participantId,
          );

          this.server.to(member.socketId).emit(RealtimeEvents.SHOW_RANK, {
            top5: rankData.top5,
            myRank,
          });
        } else if (member.role === 'host') {
          this.server.to(member.socketId).emit(RealtimeEvents.SHOW_RANK, {
            top5: rankData.top5,
            myRank: null,
          });
        }
      }
    } catch (error) {
      this.logger.error(
        `Failed to end question in room ${assessmentId}`,
        error,
      );
    }
  }

  private async endSession(assessmentId: string): Promise<void> {
    try {
      const { leaderboard } =
        await this.sessionService.endSession(assessmentId);

      this.server
        .to(assessmentId)
        .emit(RealtimeEvents.SHOW_FINAL_RANK, leaderboard);
      this.server
        .to(assessmentId)
        .emit(RealtimeEvents.SESSION_ENDED, { assessmentId });

      this.logger.log(`Session ended for assessment ${assessmentId}`);
    } catch (error) {
      this.logger.error(
        `Failed to end session for assessment ${assessmentId}`,
        error,
      );
    }
  }
}
