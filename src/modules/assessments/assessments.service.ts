import { Injectable, BadRequestException, NotFoundException, ConflictException } from '@nestjs/common';
import { AssessmentRepository } from './repositories/assessment.repository';
import { AssessmentSettingRepository } from './repositories/assessment-setting.repository';
import { AssessmentQuestionRepository } from './repositories/assessment-question.repository';
import { TopicRepository } from '../topics/repositories/topic.repository';
import { QuestionRepository } from '../questions/repositories/question.repository';
import { QuestionBankRepository } from '../question-banks/repositories/question-bank.repository';
import { AssessmentParticipantRepository } from '../executions/repositories/assessment-participant.repository';
import { ParticipantRepository } from '../executions/repositories/participant.repository';
import { CreateAssessmentDto } from './dto/create-assessment.dto';
import { UpdateAssessmentDto } from './dto/update-assessment.dto';
import { UpdateAssessmentSettingsDto } from './dto/update-assessment-settings.dto';
import { AddAssessmentQuestionDto } from './dto/add-assessment-question.dto';
import { ReplaceAssessmentQuestionsDto } from './dto/replace-assessment-questions.dto';
import { GenerateAssessmentQuestionsDto } from './dto/generate-assessment-questions.dto';
import { AddParticipantDto } from './dto/add-participant.dto';
import { UpdateParticipantDto } from './dto/update-participant.dto';
import { PaginationQueryDto } from '../../common/dto/pagination-query.dto';
import { AssessmentStatus } from './entities/assessment.entity';
import { Mode, QuestionSelection, ParticipantIdentity, ShowResults, AssessmentSetting } from './entities/assessment-settings.entity';
import { In } from 'typeorm';

@Injectable()
export class AssessmentsService {
  constructor(
    private readonly assessmentRepository: AssessmentRepository,
    private readonly assessmentSettingRepository: AssessmentSettingRepository,
    private readonly assessmentQuestionRepository: AssessmentQuestionRepository,
    private readonly topicRepository: TopicRepository,
    private readonly questionRepository: QuestionRepository,
    private readonly bankRepository: QuestionBankRepository,
    private readonly assessmentParticipantRepository: AssessmentParticipantRepository,
    private readonly participantRepository: ParticipantRepository,
  ) {}

  private transformAssessment(assessment: any) {
    if (!assessment) return assessment;
    const mapped = { ...assessment };
    mapped.title = mapped.name; // Support both title and name
    
    // Add questionCount if questions relation is loaded
    if (mapped.questions) {
      mapped.questionCount = mapped.questions.length;
      delete mapped.questions;
    } else if (mapped.questionCount === undefined) {
      mapped.questionCount = 0;
    }

    if (mapped.settings) {
      mapped.timeLimit = mapped.settings.timeLimit || 30;
      delete mapped.settings;
    } else { mapped.timeLimit = 30; }

    if (mapped.topic && mapped.topic.id) {
      mapped.topicId = mapped.topic.id;
      delete mapped.topic;
    }

    return mapped;
  }

  async findTopicAssessments(topicId: string, query: PaginationQueryDto) {
    query.topicId = topicId;
    const [assessments, total] = await this.assessmentRepository.findPaginated(query, ['name', 'description']);
    
    return {
      data: assessments.map(a => this.transformAssessment(a)),
      meta: {
        total,
        page: query.page,
        limit: query.limit,
        pageCount: Math.ceil(total / query.limit),
        topicId
      }
    };
  }

  async createAssessment(topicId: string, dto: CreateAssessmentDto) {
    const topic = await this.topicRepository.findById(topicId);
    if (!topic) throw new NotFoundException('Topic not found');

    const name = dto.name || 'Untitled Assessment';
    const type = dto.type || 'quiz';

    const assessment = await this.assessmentRepository.create({
      name,
      type,
      description: dto.description,
      status: AssessmentStatus.DRAFT,
      topic: { id: topic.id },
    } as any);

    // Create default settings
    const setting = new AssessmentSetting();
    setting.assessment = assessment;
    setting.mode = Mode.EXAM;
    setting.questionSelection = QuestionSelection.FIXED;
    setting.participantIdentity = ParticipantIdentity.AUTHENTICATED;
    setting.numQuestions = 0;
    setting.timeLimit = 30;
    setting.passMark = 70;
    setting.isShuffle = false;
    setting.showResults = ShowResults.IMMEDIATELY;
    setting.isAllowShare = false;
    setting.allowReview = true;

    await this.assessmentSettingRepository.save(setting);

    const saved = await this.assessmentRepository.findById(assessment.id);
    return this.transformAssessment(saved);
  }

  async findById(id: string) {
    const assessment = await this.assessmentRepository.findById(id);
    if (!assessment) throw new NotFoundException('Assessment not found');
    return this.transformAssessment(assessment);
  }

  async updateAssessment(id: string, dto: UpdateAssessmentDto) {
    const assessment = await this.assessmentRepository.findById(id);
    if (!assessment) throw new NotFoundException('Assessment not found');

    if (assessment.status !== AssessmentStatus.DRAFT) {
      throw new ConflictException('Assessment can only be edited in draft status');
    }

    const updateData: any = {};
    if (dto.name) updateData.name = dto.name;
    if (dto.type) updateData.type = dto.type;
    if (dto.description) updateData.description = dto.description;

    await this.assessmentRepository.update({ id } as any, updateData);
    return this.findById(id);
  }

  async deleteAssessment(id: string) {
    const assessment = await this.assessmentRepository.findById(id);
    if (!assessment) throw new NotFoundException('Assessment not found');

    await this.assessmentRepository.softDelete({ id } as any);
    return { id, deletedAt: new Date() };
  }

  async publish(id: string) {
    const assessment = await this.assessmentRepository.findById(id);
    if (!assessment) throw new NotFoundException('Assessment not found');

    await this.assessmentRepository.update({ id } as any, { status: AssessmentStatus.PUBLISHED } as any);
    return { id, status: 'published', publishedAt: new Date() };
  }

  async archive(id: string) {
    const assessment = await this.assessmentRepository.findById(id);
    if (!assessment) throw new NotFoundException('Assessment not found');

    await this.assessmentRepository.update({ id } as any, { status: AssessmentStatus.ARCHIVED } as any);
    return { id, status: 'archived', archivedAt: new Date() };
  }

  async getQuestions(id: string, query: PaginationQueryDto) {
    const assessment = await this.assessmentRepository.findById(id);
    if (!assessment) throw new NotFoundException('Assessment not found');

    const [aqList, total] = await this.assessmentQuestionRepository.findPaginated({ ...query, assessmentId: id } as any, []);

    const data: any[] = [];
    for (const aq of aqList) {
      const q = await this.questionRepository.findById((aq as any).question?.id || (aq as any).questionId);
      data.push({
        id: aq.id,
        questionId: q ? q.id : (aq as any).question?.id,
        order: aq.order,
        question: q ? {
          id: q.id,
          text: q.questionText,
          type: q.type,
          difficulty: q.difficulty,
          options: q.options || []
        } : null
      });
    }

    return {
      data,
      meta: {
        total,
        page: query.page,
        limit: query.limit,
        pageCount: Math.ceil(total / query.limit),
        assessmentId: id
      }
    };
  }

  async addQuestion(id: string, dto: AddAssessmentQuestionDto) {
    const assessment = await this.assessmentRepository.findById(id);
    if (!assessment) throw new NotFoundException('Assessment not found');

    const question = await this.questionRepository.findById(dto.questionId);
    if (!question) throw new NotFoundException('Question not found');

    // Get current max order
    const existing = await this.assessmentQuestionRepository.find({ assessment: { id } } as any);
    const maxOrder = existing.reduce((max, q) => q.order > max ? q.order : max, 0);

    const created = await this.assessmentQuestionRepository.create({
      assessment: { id },
      question: { id: question.id },
      order: maxOrder + 1
    } as any);

    return {
      id: created.id,
      assessmentId: id,
      questionId: question.id,
      order: created.order,
      addedAt: new Date()
    };
  }

  async replaceQuestions(id: string, dto: ReplaceAssessmentQuestionsDto) {
    const assessment = await this.assessmentRepository.findById(id);
    if (!assessment) throw new NotFoundException('Assessment not found');

    // Remove existing
    const existing = await this.assessmentQuestionRepository.find({ assessment: { id } } as any);
    for (const eq of existing) {
      await this.assessmentQuestionRepository.hardDelete({ id: eq.id } as any);
    }

    let order = 1;
    for (const qId of dto.questionIds) {
      const q = await this.questionRepository.findById(qId);
      if (q) {
        await this.assessmentQuestionRepository.create({
          assessment: { id },
          question: { id: q.id },
          order: order++
        } as any);
      }
    }

    return {
      assessmentId: id,
      questionCount: dto.questionIds.length,
      updatedAt: new Date()
    };
  }

  async removeQuestion(id: string, assessmentQuestionId: string) {
    const aq = await this.assessmentQuestionRepository.findById(assessmentQuestionId);
    if (!aq) throw new NotFoundException('Assessment question not found');

    await this.assessmentQuestionRepository.hardDelete({ id: assessmentQuestionId } as any);
    return { assessmentQuestionId, removedAt: new Date() };
  }

  async generateQuestions(id: string, dto: GenerateAssessmentQuestionsDto) {
    const assessment = await this.assessmentRepository.findById(id);
    if (!assessment) throw new NotFoundException('Assessment not found');

    const bank = await this.bankRepository.findById(dto.bankId);
    if (!bank) throw new NotFoundException('Question bank not found');

    // Find questions in bank
    const bankQuestions = await this.questionRepository.find({ bankQuestions: { bank: { id: dto.bankId } } } as any);
    let filtered = bankQuestions;
    if (dto.difficulty) {
      filtered = bankQuestions.filter(q => q.difficulty.toUpperCase() === dto.difficulty?.toUpperCase());
    }

    // Shuffle & pick count
    const shuffled = filtered.sort(() => 0.5 - Math.random());
    const selected = shuffled.slice(0, dto.count);

    const existing = await this.assessmentQuestionRepository.find({ assessment: { id } } as any);
    let maxOrder = existing.reduce((max, q) => q.order > max ? q.order : max, 0);

    for (const q of selected) {
      await this.assessmentQuestionRepository.create({
        assessment: { id },
        question: { id: q.id },
        order: ++maxOrder
      } as any);
    }

    return {
      assessmentId: id,
      generated: selected.length,
      totalQuestions: existing.length + selected.length
    };
  }

  async getSettings(id: string) {
    const setting = await this.assessmentSettingRepository.findByAssessmentId(id);
    if (!setting) throw new NotFoundException('Settings not found');

    return {
      assessmentId: id,
      timeLimit: setting.timeLimit || 30,
      mode: setting.mode,
      questionSelection: setting.questionSelection,
      participantIdentity: setting.participantIdentity,
      isShuffle: setting.isShuffle || false,
      showResults: setting.showResults,
      passMark: setting.passMark || 70,
      isAllowShare: setting.isAllowShare,
      allowReview: setting.allowReview,
      updatedAt: new Date()
    };
  }

  async updateSettings(id: string, dto: UpdateAssessmentSettingsDto) {
    let setting = await this.assessmentSettingRepository.findByAssessmentId(id);
    if (!setting) {
      setting = new AssessmentSetting();
      setting.assessment = { id } as any;
      setting.mode = Mode.EXAM;
      setting.questionSelection = QuestionSelection.FIXED;
      setting.participantIdentity = ParticipantIdentity.AUTHENTICATED;
      setting.numQuestions = 0;
      setting.timeLimit = 30;
      setting.passMark = 70;
      setting.isShuffle = false;
      setting.showResults = ShowResults.IMMEDIATELY;
      setting.isAllowShare = false;
      setting.allowReview = true;
      setting = await this.assessmentSettingRepository.save(setting);
    }

    const updateData: any = {};
    if (dto.timeLimit !== undefined) updateData.timeLimit = dto.timeLimit;
    if (dto.passMark !== undefined) updateData.passMark = dto.passMark;
    if (dto.isShuffle !== undefined) updateData.isShuffle = dto.isShuffle;
    if (dto.mode !== undefined) updateData.mode = dto.mode;
    if (dto.questionSelection !== undefined) updateData.questionSelection = dto.questionSelection;
    if (dto.participantIdentity !== undefined) updateData.participantIdentity = dto.participantIdentity;
    if (dto.showResults !== undefined) updateData.showResults = dto.showResults;
    if (dto.isAllowShare !== undefined) updateData.isAllowShare = dto.isAllowShare;
    if (dto.allowReview !== undefined) updateData.allowReview = dto.allowReview;
    if (dto.numQuestions !== undefined) updateData.numQuestions = dto.numQuestions;

    await this.assessmentSettingRepository.update(setting.id, updateData);
    return this.getSettings(id);
  }

  async getParticipants(id: string, query: PaginationQueryDto) {
    const [apList, total] = await this.assessmentParticipantRepository.findPaginated({ ...query, assessmentId: id } as any, []);

    const data: any[] = [];
    for (const ap of apList) {
      const p = await this.participantRepository.findById((ap as any).participant?.id || (ap as any).participantId);
      if (p) {
        data.push({
          id: ap.id,
          assessmentId: id,
          name: p.name,
          email: p.email,
          phone: p.phone,
          status: ap.status,
          assignedAt: ap.createdAt
        });
      }
    }

    return {
      data,
      meta: {
        total,
        page: query.page,
        limit: query.limit,
        pageCount: Math.ceil(total / query.limit),
        assessmentId: id
      }
    };
  }

  async addParticipant(id: string, dto: AddParticipantDto) {
    const assessment = await this.assessmentRepository.findById(id);
    if (!assessment) throw new NotFoundException('Assessment not found');

    // Find or create participant
    let participant = await this.participantRepository.findOne({ email: dto.email } as any);
    if (!participant) {
      participant = await this.participantRepository.create({
        name: dto.name,
        email: dto.email,
        phone: dto.phone
      } as any);
    }

    const ap = await this.assessmentParticipantRepository.create({
      assessment: { id },
      participant: { id: participant.id },
      status: 'pending'
    } as any);

    return {
      id: ap.id,
      assessmentId: id,
      name: participant.name,
      email: participant.email,
      status: ap.status,
      assignedAt: ap.createdAt
    };
  }

  async getParticipant(id: string, participantId: string) {
    const ap = await this.assessmentParticipantRepository.findById(participantId);
    if (!ap) throw new NotFoundException('Participant not found');

    const p = await this.participantRepository.findById((ap as any).participant?.id || (ap as any).participantId);
    return {
      id: ap.id,
      assessmentId: id,
      name: p ? p.name : 'Unknown',
      email: p ? p.email : '',
      phone: p ? p.phone : '',
      status: ap.status,
      assignedAt: ap.createdAt
    };
  }

  async updateParticipant(id: string, participantId: string, dto: UpdateParticipantDto) {
    const ap = await this.assessmentParticipantRepository.findById(participantId);
    if (!ap) throw new NotFoundException('Participant not found');

    const pId = (ap as any).participant?.id || (ap as any).participantId;
    if (pId) {
      const updateData: any = {};
      if (dto.name) updateData.name = dto.name;
      if (dto.email) updateData.email = dto.email;
      if (dto.phone) updateData.phone = dto.phone;
      await this.participantRepository.update({ id: pId } as any, updateData);
    }

    return this.getParticipant(id, participantId);
  }

  async removeParticipant(id: string, participantId: string) {
    const ap = await this.assessmentParticipantRepository.findById(participantId);
    if (!ap) throw new NotFoundException('Participant not found');

    await this.assessmentParticipantRepository.hardDelete({ id: participantId } as any);
    return { id: participantId, removedAt: new Date() };
  }
}
