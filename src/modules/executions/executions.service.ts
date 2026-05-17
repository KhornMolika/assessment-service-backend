import { Injectable, BadRequestException, NotFoundException, ConflictException } from '@nestjs/common';
import { AssessmentParticipantRepository } from './repositories/assessment-participant.repository';
import { ParticipantRepository } from './repositories/participant.repository';
import { AnswerSheetRepository } from './repositories/answer-sheet.repository';
import { AnswerEntryRepository } from './repositories/answer-entry.repository';
import { AssessmentRepository } from '../assessments/repositories/assessment.repository';
import { AssessmentSettingRepository } from '../assessments/repositories/assessment-setting.repository';
import { AssessmentQuestionRepository } from '../assessments/repositories/assessment-question.repository';
import { QuestionRepository } from '../questions/repositories/question.repository';
import { StartSessionDto } from './dto/start-session.dto';
import { SubmitSessionDto } from './dto/submit-session.dto';
import { SaveAnswerDto } from './dto/save-answer.dto';
import { UpdateAnswerDto } from './dto/update-answer.dto';
import { AnswerSheet } from './entities/answer-sheet.entity';
import { AnswerEntry, GradingStatus } from './entities/answer-entry.entity';

@Injectable()
export class ExecutionsService {
  constructor(
    private readonly assessmentParticipantRepository: AssessmentParticipantRepository,
    private readonly participantRepository: ParticipantRepository,
    private readonly answerSheetRepository: AnswerSheetRepository,
    private readonly answerEntryRepository: AnswerEntryRepository,
    private readonly assessmentRepository: AssessmentRepository,
    private readonly assessmentSettingRepository: AssessmentSettingRepository,
    private readonly assessmentQuestionRepository: AssessmentQuestionRepository,
    private readonly questionRepository: QuestionRepository,
  ) {}

  async startSession(dto: StartSessionDto) {
    const assessment = await this.assessmentRepository.findById(dto.assessmentId);
    if (!assessment) throw new NotFoundException('Assessment not found');

    let ap = await this.assessmentParticipantRepository.findById(dto.participantId);
    if (!ap) {
      ap = await this.assessmentParticipantRepository.findOne({
        assessment: { id: dto.assessmentId },
        participant: { id: dto.participantId }
      } as any);
    }

    if (!ap) throw new NotFoundException('Participant not assigned to this assessment');

    // Create AnswerSheet
    const sheet = await this.answerSheetRepository.create({
      assessmentParticipant: { id: ap.id },
      startedAt: new Date(),
      isPassed: false
    } as any);

    // Fetch assessment questions
    const aqList = await this.assessmentQuestionRepository.find({ assessment: { id: dto.assessmentId } } as any);
    const questions: any[] = [];

    for (const aq of aqList) {
      const q = await this.questionRepository.findById((aq as any).question?.id || (aq as any).questionId);
      if (q) {
        questions.push({
          id: q.id,
          text: q.questionText,
          type: q.type,
          options: q.options || []
        });
      }
    }

    const settings = await this.assessmentSettingRepository.findByAssessmentId(dto.assessmentId);
    const duration = settings?.timeLimit || 30;
    const expiresAt = new Date(Date.now() + duration * 60 * 1000);

    return {
      sessionId: sheet.id,
      assessmentId: dto.assessmentId,
      participantId: dto.participantId,
      startedAt: sheet.startedAt,
      expiresAt,
      questions
    };
  }

  async submitSession(sessionId: string, dto: SubmitSessionDto) {
    const sheet = await this.answerSheetRepository.findById(sessionId);
    if (!sheet) throw new NotFoundException('Session not found');

    if (sheet.submittedAt) {
      throw new ConflictException('Session already submitted');
    }

    const submittedAt = dto.submittedAt ? new Date(dto.submittedAt) : new Date();
    await this.answerSheetRepository.update({ id: sessionId } as any, { submittedAt } as any);

    // Update AssessmentParticipant status
    const sheetWithAp = await this.answerSheetRepository.findOne({ id: sessionId } as any);
    const apId = (sheetWithAp as any).assessmentParticipant?.id || (sheetWithAp as any).assessmentParticipantId;
    if (apId) {
      await this.assessmentParticipantRepository.update({ id: apId } as any, { status: 'submitted' } as any);
    }

    return {
      sessionId,
      status: 'submitted',
      submittedAt
    };
  }

  async saveAnswer(sessionId: string, dto: SaveAnswerDto) {
    const sheet = await this.answerSheetRepository.findById(sessionId);
    if (!sheet) throw new NotFoundException('Session not found');

    if (sheet.submittedAt) {
      throw new ConflictException('Cannot modify answer after submission');
    }

    // Find AssessmentQuestion
    const aqList = await this.assessmentQuestionRepository.find({ question: { id: dto.questionId } } as any);
    if (!aqList.length) throw new NotFoundException('Question not found in assessment');
    const aq = aqList[0];

    // Check if answer entry already exists
    let entry = await this.answerEntryRepository.findOne({
      answerSheet: { id: sessionId },
      assessmentQuestion: { id: aq.id }
    } as any);

    if (entry) {
      await this.answerEntryRepository.update({ id: entry.id } as any, { response: { answer: dto.answer } } as any);
    } else {
      entry = await this.answerEntryRepository.create({
        answerSheet: { id: sessionId },
        assessmentQuestion: { id: aq.id },
        response: { answer: dto.answer },
        gradingStatus: GradingStatus.PENDING
      } as any);
    }

    return {
      id: entry.id,
      sessionId,
      questionId: dto.questionId,
      answer: dto.answer,
      savedAt: new Date()
    };
  }

  async updateAnswer(sessionId: string, entryId: string, dto: UpdateAnswerDto) {
    const sheet = await this.answerSheetRepository.findById(sessionId);
    if (!sheet) throw new NotFoundException('Session not found');

    if (sheet.submittedAt) {
      throw new ConflictException('Cannot modify answer after submission');
    }

    const entry = await this.answerEntryRepository.findById(entryId);
    if (!entry) throw new NotFoundException('Answer entry not found');

    await this.answerEntryRepository.update({ id: entryId } as any, { response: { answer: dto.answer } } as any);

    return {
      id: entryId,
      answer: dto.answer,
      updatedAt: new Date()
    };
  }

  async getResult(sessionId: string) {
    const sheet = await this.answerSheetRepository.findById(sessionId);
    if (!sheet) throw new NotFoundException('Session not found');

    if (!sheet.submittedAt) {
      throw new BadRequestException('Session must be submitted before viewing results');
    }

    // Calculate score
    const entries = await this.answerEntryRepository.find({ answerSheet: { id: sessionId } } as any);
    let correctAnswers = 0;
    for (const e of entries) {
      const aq = await this.assessmentQuestionRepository.findById((e as any).assessmentQuestion?.id || (e as any).assessmentQuestionId);
      if (aq) {
        const q = await this.questionRepository.findById((aq as any).question?.id || (aq as any).questionId);
        if (q && q.correctAnswer) {
          const clientAnswer = e.response?.answer;
          const expectedAnswer = (q.correctAnswer as any)?.answer || q.correctAnswer;
          if (JSON.stringify(clientAnswer) === JSON.stringify(expectedAnswer)) {
            correctAnswers++;
            await this.answerEntryRepository.update({ id: e.id } as any, { isCorrect: true, scoreAwarded: q.points || 1, gradingStatus: GradingStatus.AUTOMATIC } as any);
          } else {
            await this.answerEntryRepository.update({ id: e.id } as any, { isCorrect: false, scoreAwarded: 0, gradingStatus: GradingStatus.AUTOMATIC } as any);
          }
        }
      }
    }

    const sheetWithAp = await this.answerSheetRepository.findOne({ id: sessionId } as any);
    const apId = (sheetWithAp as any).assessmentParticipant?.id || (sheetWithAp as any).assessmentParticipantId;
    let ap: any = null;
    if (apId) ap = await this.assessmentParticipantRepository.findById(apId);

    const totalQuestions = entries.length || 10;
    const score = Math.round((correctAnswers / totalQuestions) * 100);
    const passed = score >= 70;

    await this.answerSheetRepository.update({ id: sessionId } as any, { totalScore: score, isPassed: passed } as any);
    if (apId) await this.assessmentParticipantRepository.update({ id: apId } as any, { totalScore: score, status: 'completed' } as any);

    const duration = sheet.startedAt && sheet.submittedAt ? Math.round((sheet.submittedAt.getTime() - sheet.startedAt.getTime()) / 60000) : 25;

    return {
      sessionId,
      participantId: ap ? (ap as any).participant?.id || (ap as any).participantId : 'unknown',
      assessmentId: ap ? (ap as any).assessment?.id || (ap as any).assessmentId : 'unknown',
      score,
      passed,
      totalQuestions,
      correctAnswers,
      duration,
      submittedAt: sheet.submittedAt
    };
  }
}
