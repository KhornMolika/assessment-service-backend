import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { AssessmentSetting } from '../entities/assessment-settings.entity';

@Injectable()
export class AssessmentSettingRepository {
  constructor(
    @InjectRepository(AssessmentSetting)
    private readonly repository: Repository<AssessmentSetting>,
  ) {}

  async findByAssessmentId(assessmentId: string): Promise<AssessmentSetting | null> {
    return this.repository.findOne({ where: { assessment: { id: assessmentId } } });
  }

  async save(setting: AssessmentSetting): Promise<AssessmentSetting> {
    return this.repository.save(setting);
  }

  async update(id: string, data: Partial<AssessmentSetting>): Promise<void> {
    await this.repository.update(id, data);
  }
}
