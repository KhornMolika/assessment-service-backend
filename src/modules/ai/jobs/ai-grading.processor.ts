import { Process, Processor } from '@nestjs/bull';
import { Inject, forwardRef, Logger } from '@nestjs/common';
import type { Job } from 'bull';
import { DataSource, Repository } from 'typeorm';
import { AIGradingService } from '../services/ai-grading.service';
import { GradingEngineService } from '@modules/grading/services/grading-engine.service';
import { AnswerEntry } from '@modules/assessments/entities/answer-entry.entity';
import { clientStorage } from '@common/context/client.storage';

interface AIGradingJobData {
  answerEntryId: string;
  clientId: string;
}

@Processor('ai-grading')
export class AIGradingProcessor {
  private readonly logger = new Logger(AIGradingProcessor.name);
  private readonly answerEntries: Repository<AnswerEntry>;

  constructor(
    private readonly aiGrading: AIGradingService,
    @Inject(forwardRef(() => GradingEngineService))
    private readonly gradingEngine: GradingEngineService,
    dataSource: DataSource,
  ) {
    this.answerEntries = dataSource.getRepository(AnswerEntry);
  }

  @Process('grade')
  async handleGrade(job: Job<AIGradingJobData>): Promise<void> {
    const { answerEntryId, clientId } = job.data;

    this.logger.log(
      `Processing background AI grading job for AnswerEntry [${answerEntryId}] under Client [${clientId}]`,
    );

    await clientStorage.run({ clientId }, async () => {
      try {
        const entry = await this.answerEntries.findOne({
          where: { id: answerEntryId, clientId },
          relations: ['assessmentQuestion', 'answerSheet'],
        });

        if (!entry) {
          throw new Error(
            `AnswerEntry [${answerEntryId}] not found for client [${clientId}]`,
          );
        }

        // Perform AI grading (updates AnswerEntry status and inserts job)
        const result = await this.aiGrading.gradeEntry(entry);

        this.logger.log(
          `AI grading completed for AnswerEntry [${answerEntryId}]. ` +
            `Suggested score: ${result.evaluation.suggestedScore}`,
        );

        // Recalculate session status and scores
        await this.gradingEngine.recalculateSession(entry.answerSheetId);
      } catch (error) {
        this.logger.error(
          `Failed to process background AI grading job for AnswerEntry [${answerEntryId}]`,
          error instanceof Error ? error.stack : error,
        );
        throw error; // rethrow so Bull marks job as failed and handles retries
      }
    });
  }
}
