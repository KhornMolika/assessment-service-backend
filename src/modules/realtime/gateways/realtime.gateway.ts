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
import { OnEvent } from '@nestjs/event-emitter';
import { clientStorage } from '../../../common/context/client.storage';

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

  private async withContext<T>(
    sessionCode: string,
    fn: () => Promise<T>,
  ): Promise<T> {
    const session = await this.sessionService['redis'].getSession(sessionCode);
    this.logger.log(
      `withContext: sessionCode=${sessionCode}, session=${!!session}, clientId=${session?.clientId || 'NONE'}`,
    );
    if (session && session.clientId) {
      return clientStorage.run({ clientId: session.clientId }, fn);
    }
    this.logger.warn(
      `withContext: No clientId found for sessionCode=${sessionCode}, running without context`,
    );
    return fn();
  }

  // ---------------------------------------------------------------------------
  // ADMIN DASHBOARD
  // ---------------------------------------------------------------------------

  @SubscribeMessage('JOIN_ADMIN_ROOM')
  handleJoinAdminRoom(
    @ConnectedSocket() socket: Socket,
    @MessageBody() data: { clientId: string },
  ) {
    if (data?.clientId) {
      // eslint-disable-next-line @typescript-eslint/no-floating-promises
      socket.join(`admin_assessments_${data.clientId}`);
      this.logger.log(
        `Socket ${socket.id} joined admin room for client ${data.clientId}`,
      );
    }
  }

  @OnEvent('assessment.status.updated')
  handleAssessmentStatusUpdated(payload: {
    clientId: string;
    assessmentId: string;
    status: string;
  }) {
    this.server
      .to(`admin_assessments_${payload.clientId}`)
      .emit('ASSESSMENT_UPDATED', payload);
    this.logger.log(
      `Broadcasted ASSESSMENT_UPDATED for assessment ${payload.assessmentId} (client: ${payload.clientId})`,
    );
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
      const sessionCode = dto.roomId;

      await this.withContext(sessionCode, async () => {
        await socket.join(sessionCode);
        this.socketRooms.set(socket.id, sessionCode);

        const result = await this.sessionService.joinRoom(
          sessionCode,
          socket.id,
          dto.participantId ?? null,
          dto.role,
          dto.name ?? null,
        );

        this.server.to(sessionCode).emit(RealtimeEvents.ROOM_UPDATE, {
          count: result.count,
          participants: result.participants,
        });

        this.logger.log(`${dto.role} ${socket.id} joined room ${sessionCode}`);

        // Reconnect resilience for participants
        if (dto.role === RoomRole.PARTICIPANT) {
          const session =
            await this.sessionService['redis'].getSession(sessionCode);
          if (
            session &&
            session.status === 'active' &&
            session.currentQuestionId
          ) {
            const endTimeStr = session.questionEndTime;
            const endTime = endTimeStr ? new Date(endTimeStr).getTime() : 0;
            const now = Date.now();

            if (endTime > now) {
              const questions =
                await this.sessionService[
                  'assessmentQuestions'
                ].findByAssessment(session.sessionCode);
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
      });
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
      const sessionCode = dto.roomId || this.socketRooms.get(socket.id);
      if (!sessionCode) throw new Error('Not in a room');

      await this.withContext(sessionCode, async () => {
        const session =
          await this.sessionService['redis'].getSession(sessionCode);
        if (session?.status === 'active' && session.currentQuestionId) {
          await this.endCurrentQuestion(sessionCode);
        }

        try {
          const questionData = await this.sessionService.startQuestion(
            sessionCode,
            socket.id,
            dto.questionId,
          );

          this.server
            .to(sessionCode)
            .emit(RealtimeEvents.NEW_QUESTION, questionData);

          this.logger.log(
            `Question ${questionData.questionNumber}/${questionData.totalQuestions} started in room ${sessionCode}`,
          );
        } catch (err: any) {
          if (err.message === 'No more questions') {
            await this.endSession(sessionCode);
          } else {
            throw err;
          }
        }
      });
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
  async handleRevealAnswers(
    @ConnectedSocket() socket: Socket,
    @MessageBody() data?: { roomId?: string },
  ) {
    try {
      const sessionCode = this.socketRooms.get(socket.id) ?? data?.roomId;
      if (!sessionCode) throw new Error('Not in a room');

      await this.withContext(sessionCode, async () => {
        const session =
          await this.sessionService['redis'].getSession(sessionCode);
        if (!session?.isPreview && session?.hostSocketId !== socket.id) {
          throw new Error('Only the host can reveal answers');
        }

        if (session?.status === 'active' && session.currentQuestionId) {
          await this.endCurrentQuestion(sessionCode);
        }
      });
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
      const sessionCode = dto.roomId || this.socketRooms.get(socket.id);
      if (!sessionCode) throw new Error('Not in a room');

      await this.withContext(sessionCode, async () => {
        const members =
          await this.sessionService['redis'].getMembers(sessionCode);
        const member = members.find((m) => m.socketId === socket.id);
        if (!member?.participantId) {
          socket.emit(RealtimeEvents.ERROR, {
            event: RealtimeEvents.SUBMIT_ANS,
            message: 'Participant not found in room',
          });
          return;
        }

        const session =
          await this.sessionService['redis'].getSession(sessionCode);
        if (!session || !session.currentQuestionId)
          throw new Error('No active question');

        const result = await this.sessionService.submitAnswer(
          sessionCode,
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
          await this.sessionService['redis'].getSession(sessionCode);
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
          await this.endCurrentQuestion(sessionCode);
        }
      });
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
    const sessionCode = this.socketRooms.get(socket.id);
    if (!sessionCode) return;

    try {
      const result = await this.sessionService.handleDisconnect(
        socket.id,
        sessionCode,
      );

      this.server.to(sessionCode).emit(RealtimeEvents.ROOM_UPDATE, {
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

  private async endCurrentQuestion(sessionCode: string): Promise<void> {
    try {
      const results = await this.sessionService.endQuestion(sessionCode);
      if (results.alreadyEnded) {
        return;
      }

      let correctStr = '';
      if (results.correctAnswer) {
        if (results.correctAnswer.optionId !== undefined) {
          correctStr = results.correctAnswer.optionId;
        } else if (results.correctAnswer.value !== undefined) {
          correctStr = String(results.correctAnswer.value);
        } else {
          correctStr = JSON.stringify(results.correctAnswer);
        }
      }

      this.server.to(sessionCode).emit(RealtimeEvents.Q_RESULTS, {
        correct: correctStr,
        stats: results.stats,
      });

      const rankData = await this.sessionService.getRankData(sessionCode);
      const members =
        await this.sessionService['redis'].getMembers(sessionCode);

      for (const member of members) {
        if (member.role === 'participant' && member.participantId) {
          const myRank = await this.sessionService['redis'].getParticipantRank(
            sessionCode,
            member.participantId,
          );

          this.server.to(member.socketId).emit(RealtimeEvents.SHOW_RANK, {
            top5: rankData.top5,
            myRank,
            myResult: results.participantResults[member.participantId] ?? {
              questionId: results.questionId,
              correct: false,
              pointsEarned: 0,
              speedBonus: 0,
              totalScore: myRank?.score ?? 0,
            },
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
        `Failed to end question in room ${sessionCode}`,
        error,
      );
    }
  }

  private async endSession(sessionCode: string): Promise<void> {
    try {
      const { leaderboard } =
        await this.sessionService.endSession(sessionCode);

      this.server
        .to(sessionCode)
        .emit(RealtimeEvents.SHOW_FINAL_RANK, leaderboard);
      this.server
        .to(sessionCode)
        .emit(RealtimeEvents.SESSION_ENDED, { sessionCode });

      this.logger.log(`Session ended for room ${sessionCode}`);
    } catch (error) {
      this.logger.error(
        `Failed to end session for room ${sessionCode}`,
        error,
      );
    }
  }
}
