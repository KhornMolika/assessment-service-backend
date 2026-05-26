import { Processor, Process } from '@nestjs/bull';
import type { Job } from 'bull';
import { Injectable, Logger } from '@nestjs/common';
import { AnswerSheetRepository } from '../repositories/answer-sheet.repository';
import { AnswerSheetStatus } from '@modules/assessments/entities/answer-sheet.entity';

export const SESSION_EXPIRY_QUEUE = 'session-expiry';

export interface SessionExpiryJobData {
  sessionId: string;
  clientId: string;
}

@Processor(SESSION_EXPIRY_QUEUE)
@Injectable()
export class SessionExpiryProcessor {
  private readonly logger = new Logger(SessionExpiryProcessor.name);

  constructor(private readonly answerSheets: AnswerSheetRepository) {}

  /**
   * Fires 5 minutes before time limit expires.
   * In self-paced mode this logs a warning — WebSocket notification
   * added in the real-time phase.
   */
  @Process('warning')
  async handleWarning(job: Job<SessionExpiryJobData>) {
    const { sessionId } = job.data;
    this.logger.warn(`Session ${sessionId} expiring in 5 minutes`);
    // TODO: emit WebSocket event in real-time phase
  }

  /**
   * Fires when the time limit is reached.
   * Auto-submits the session if still IN_PROGRESS.
   * Sets status to SUBMITTED and submittedAt to now.
   * Grading is triggered separately by the grading engine.
   */
  @Process('expire')
  async handleExpiry(job: Job<SessionExpiryJobData>) {
    const { sessionId } = job.data;

    try {
      const sheet = await this.answerSheets.findById(sessionId);
      if (!sheet) {
        this.logger.warn(`Session ${sessionId} not found for auto-submit`);
        return;
      }

      if (sheet.status !== AnswerSheetStatus.IN_PROGRESS) {
        this.logger.log(
          `Session ${sessionId} already ${sheet.status} — skipping auto-submit`,
        );
        return;
      }

      await this.answerSheets.update(
        { id: sessionId },
        {
          status: AnswerSheetStatus.SUBMITTED,
          submittedAt: new Date(),
        },
      );

      this.logger.log(`Session ${sessionId} auto-submitted due to time limit`);
      // TODO: trigger grading engine in grading phase
    } catch (error) {
      this.logger.error(`Failed to auto-submit session ${sessionId}`, error);
      throw error; // rethrow so Bull can retry
    }
  }
}
