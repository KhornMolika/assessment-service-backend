import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { AssessmentSetting } from '../entities/assessment-settings.entity';
import { ClientRepository } from '@common/base/client-repository';

@Injectable()
export class AssessmentSettingRepository extends ClientRepository<AssessmentSetting> {
  constructor(
    @InjectRepository(AssessmentSetting)
    repo: Repository<AssessmentSetting>,
  ) {
    super(repo);
  }

  findByAssessment(assessmentId: string) {
    return this.qb('s')
      .andWhere('s.assessmentId = :assessmentId', { assessmentId })
      .getOne();
  }
}