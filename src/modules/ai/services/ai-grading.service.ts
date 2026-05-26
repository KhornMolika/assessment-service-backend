import {
  BadRequestException,
  Injectable,
  InternalServerErrorException,
  NotFoundException,
} from '@nestjs/common';
import { DataSource, Repository } from 'typeorm';
import { InjectQueue } from '@nestjs/bull';
import type { Queue } from 'bull';
import {
  AnswerEntry,
  GradingStatus,
} from '@modules/assessments/entities/answer-entry.entity';
import { QuestionTypeName } from '@modules/questions/constants/question-types.config';
import {
  AIGradingJob,
  AIGradingJobStatus,
} from '../entities/ai-grading-job.entity';
import { AIGradingJobRepository } from '../repositories/ai-grading-job.repository';
import { AIPromptService } from './ai-prompt.service';
import { GeminiService } from './gemini.service';
import { AIEvaluationResult } from '../interfaces/ai-evaluation-result.interface';

const AI_GRADED_TYPES = [QuestionTypeName.SHORT_ANSWER, QuestionTypeName.ESSAY];

interface GradeEntryResult {
  job: AIGradingJob;
  evaluation: AIEvaluationResult;
}

@Injectable()
export class AIGradingService {
  private readonly answerEntries: Repository<AnswerEntry>;

  constructor(
    private readonly jobs: AIGradingJobRepository,
    private readonly prompts: AIPromptService,
    private readonly gemini: GeminiService,
    @InjectQueue('ai-grading')
    private readonly aiGradingQueue: Queue,
    dataSource: DataSource,
  ) {
    this.answerEntries = dataSource.getRepository(AnswerEntry);
  }

  async queueGradingJob(
    answerEntryId: string,
    clientId: string,
  ): Promise<void> {
    await this.aiGradingQueue.add(
      'grade',
      { answerEntryId, clientId },
      {
        attempts: 3,
        backoff: {
          type: 'exponential',
          delay: 5000,
        },
      },
    );
  }

  async gradeEntry(entry: AnswerEntry): Promise<GradeEntryResult> {
    const payload = this.resolvePayload(entry);
    const existingJob = await this.jobs.findLatestByAnswerEntry(entry.id);
    const job =
      existingJob && existingJob.status !== AIGradingJobStatus.COMPLETED
        ? existingJob
        : await this.jobs.save({ answerEntryId: entry.id });

    return this.processJob(job, entry, payload);
  }

  async retry(jobId: string): Promise<{
    job: AIGradingJob;
    sessionId: string;
    evaluation: AIEvaluationResult;
  }> {
    const job = await this.jobs.findByIdWithEntry(jobId);
    if (!job) throw new NotFoundException('AI grading job not found');
    if (!job.answerEntry) {
      throw new NotFoundException('Answer entry for AI grading job not found');
    }

    const payload = this.resolvePayload(job.answerEntry);
    const result = await this.processJob(job, job.answerEntry, payload);
    return {
      ...result,
      sessionId: job.answerEntry.answerSheetId,
    };
  }

  private async processJob(
    job: AIGradingJob,
    entry: AnswerEntry,
    payload: ReturnType<AIGradingService['resolvePayload']>,
  ): Promise<GradeEntryResult> {
    await this.jobs.update(
      { id: job.id },
      {
        status: AIGradingJobStatus.PROCESSING,
        failureReason: undefined,
        attemptCount: Number(job.attemptCount ?? 0) + 1,
      },
    );

    try {
      const prompt = this.prompts.buildEvaluationPrompt(payload);
      const evaluation = await this.gemini.evaluate(prompt, payload.points);
      const reasoning = this.stringifyReasoning(evaluation);

      await this.jobs.update(
        { id: job.id },
        {
          status: AIGradingJobStatus.COMPLETED,
          suggestedScore: evaluation.suggestedScore,
          reasoning,
          processedAt: new Date(),
        },
      );

      await this.answerEntries.update(
        { id: entry.id, clientId: entry.clientId },
        {
          scoreAwarded: evaluation.suggestedScore,
          maxScore: payload.points,
          gradingStatus: GradingStatus.AI_EVALUATED,
        },
      );

      return {
        job: {
          ...job,
          status: AIGradingJobStatus.COMPLETED,
          suggestedScore: evaluation.suggestedScore,
          reasoning,
        },
        evaluation,
      };
    } catch (error) {
      const failureReason =
        error instanceof Error ? error.message : 'AI grading failed';

      await this.jobs.update(
        { id: job.id },
        {
          status: AIGradingJobStatus.FAILED,
          failureReason,
          processedAt: new Date(),
        },
      );

      await this.answerEntries.update(
        { id: entry.id, clientId: entry.clientId },
        {
          maxScore: payload.points,
          gradingStatus: GradingStatus.PENDING,
        },
      );

      throw new InternalServerErrorException(failureReason);
    }
  }

  /* eslint-disable @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-call */
  private resolvePayload(entry: AnswerEntry) {
    const snapshot = entry.assessmentQuestion?.questionSnapshot as Record<
      string,
      any
    >;
    const type = snapshot?.type as QuestionTypeName;

    if (!AI_GRADED_TYPES.includes(type)) {
      throw new BadRequestException(`Question type [${type}] is not AI graded`);
    }

    const correctAnswer = snapshot.correctAnswer ?? {};
    const participantResponse = this.extractResponseText(entry.response);
    if (!participantResponse) {
      throw new BadRequestException('Participant response text is empty');
    }

    return {
      questionType: type,
      questionText: String(snapshot.questionText ?? ''),
      participantResponse,
      modelAnswerReference: String(correctAnswer.modelAnswerReference ?? ''),
      keyPointsExpected: Array.isArray(correctAnswer.keyPointsExpected)
        ? correctAnswer.keyPointsExpected.map(String)
        : [],
      points: Number(entry.assessmentQuestion?.points ?? 0),
      maxWords:
        typeof snapshot.options?.maxWords === 'number'
          ? snapshot.options.maxWords
          : undefined,
    };
  }

  private extractResponseText(response: Record<string, any> | undefined) {
    if (!response) return '';
    if (typeof response.text === 'string') return response.text.trim();
    if (typeof response.answer === 'string') return response.answer.trim();
    if (typeof response.value === 'string') return response.value.trim();
    return '';
  }

  private stringifyReasoning(evaluation: AIEvaluationResult): string {
    return JSON.stringify({
      reasoning: evaluation.reasoning,
      keyPointsAddressed: evaluation.keyPointsAddressed,
      keyPointsMissed: evaluation.keyPointsMissed,
      confidence: evaluation.confidence,
    });
  }
  /* eslint-enable @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-call */
}
