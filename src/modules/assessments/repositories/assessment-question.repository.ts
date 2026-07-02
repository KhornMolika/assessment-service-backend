import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { In, Repository } from 'typeorm';
import { ClientRepository } from '@common/base/client-repository';
import { AssessmentQuestion } from '../entities/assessment-question.entity';
import { ClientContextService } from '@common/context/client-context.service';

@Injectable()
export class AssessmentQuestionRepository extends ClientRepository<AssessmentQuestion> {
  constructor(
    @InjectRepository(AssessmentQuestion)
    repository: Repository<AssessmentQuestion>,
  ) {
    super(repository);
  }

  /**
   * All questions for an assessment in display order (ASC).
   * Joins source question record for type, text, options access.
   */
  findByAssessment(assessmentId: string): Promise<AssessmentQuestion[]> {
    return this.qb('aq')
      .leftJoinAndSelect('aq.question', 'question')
      .andWhere('aq.assessmentId = :assessmentId', { assessmentId })
      .andWhere('aq.deletedAt IS NULL')
      .orderBy('aq.order', 'ASC')
      .getMany();
  }

  async findByIdsPreservingOrder(ids: string[]): Promise<AssessmentQuestion[]> {
    if (ids.length === 0) return [];

    const questions = await this.repo.find({
      where: this.clientWhere({ id: In(ids) }),
      relations: ['question'],
    });
    const order = new Map(ids.map((id, index) => [id, index]));

    return questions.sort(
      (left, right) =>
        (order.get(left.id) ?? Number.MAX_SAFE_INTEGER) -
        (order.get(right.id) ?? Number.MAX_SAFE_INTEGER),
    );
  }

  /**
   * Current highest order value for an assessment.
   * Used to append new questions at end of list. Returns 0 if none exist.
   */
  findMaxOrder(assessmentId: string): Promise<number> {
    return this.qb('aq')
      .select('COALESCE(MAX(aq.order), 0)', 'max')
      .andWhere('aq.assessmentId = :assessmentId', { assessmentId })
      .andWhere('aq.deletedAt IS NULL')
      .getRawOne<{ max: string | number }>()
      .then((r) => Number(r?.max ?? 0));
  }

  /**
   * Removes all existing questions for an assessment and inserts
   * a replacement set. clientId injected on every inserted record.
   */
  async replaceAll(
    assessmentId: string,
    questions: Partial<AssessmentQuestion>[],
  ) {
    await this.repo
      .createQueryBuilder()
      .delete()
      .from(AssessmentQuestion)
      .where('"assessmentId" = :assessmentId AND "clientId" = :clientId', {
        assessmentId,
        clientId: ClientContextService.getClientId(),
      })
      .execute();

    return this.repo.save(
      questions.map((q) => ({
        ...q,
        assessmentId,
        clientId: ClientContextService.getClientId(),
      })) as AssessmentQuestion[],
    );
  }
}
