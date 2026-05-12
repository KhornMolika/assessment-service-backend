import { Injectable } from '@nestjs/common';
import { DataSource } from 'typeorm';
import { TenantRepository } from '../../../common/base/tenant.repository';
import { Topic } from '../entities/topic.entity';

@Injectable()
export class TopicRepository extends TenantRepository<Topic> {
  
  constructor(protected readonly dataSource: DataSource) {
    super(dataSource, Topic);
  }

  /*
  |--------------------------------------------------------------------------
  | Create Topic
  |--------------------------------------------------------------------------
  */
  async createTopic(data: Partial<Topic>) {
    return this.repository.save({
      ...data,
      clientId: this.clientId(),
    });
  }

  /*
  |--------------------------------------------------------------------------
  | Find all topics
  |--------------------------------------------------------------------------
  */
  async findAllTopics() {
    return this.repository.find({
      where: this.withClient({
        isActive: true,
      }),
      order: {
        createdAt: 'DESC',
      },
    });
  }

  /*
  |--------------------------------------------------------------------------
  | Find topic by id
  |--------------------------------------------------------------------------
  */
  async findTopicById(id: string) {
    return this.repository.findOne({
      where: this.withClient({
        id,
        isActive: true,
      }),
    });
  }

  /*
  |--------------------------------------------------------------------------
  | Update topic by id
  |--------------------------------------------------------------------------
  */
  async updateTopic(id: string, data: Partial<Topic>) {
    await this.repository.update(
      this.withClient({
        id,
        isActive: true,
      }),
      data,
    );

    return this.findTopicById(id);
  }

  /*
  |--------------------------------------------------------------------------
  | Delete topic by id
  |--------------------------------------------------------------------------
  */
  async deleteTopic(id: string) {
    await this.repository.update(this.withClient({ id }), {
      isActive: false,
    });
  }

  async existsBySlug(slug: string) {
    return this.repository.exists({
      where: this.withClient({ slug }),
    });
  }
}
