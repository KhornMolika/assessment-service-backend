import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { TopicRepository } from './repositories/topic.repository';
import { CreateTopicDto } from './dto/create-topic.dto';
import { UpdateTopicDto } from './dto/update-topic.dto';

@Injectable()
export class TopicsService {
  constructor(private readonly topicRepository: TopicRepository) {}

  /*
  |--------------------------------------------------------------------------
  | Create Topic
  |--------------------------------------------------------------------------
  */
  async create(dto: CreateTopicDto) {
    try {
      const exists = await this.topicRepository.existsBySlug(dto.slug);

      if (exists) {
        throw new BadRequestException('Topic slug already exists');
      }

      return this.topicRepository.createTopic(dto);
    } catch (error) {
      console.log(error);
      if (error instanceof BadRequestException) throw error;
      throw new BadRequestException('Failed to create topic');
    }
  }

  /*
  |--------------------------------------------------------------------------
  | Find all topics
  |--------------------------------------------------------------------------
  */
  async findAll() {
    try {
      return this.topicRepository.findAllTopics();
    } catch (error) {
      throw new BadRequestException('Could not fetch topics');
    }
  }

  /*
  |--------------------------------------------------------------------------
  | Find Topic by id
  |--------------------------------------------------------------------------
  */
  async findById(id: string) {
    try {
      const topic = await this.topicRepository.findTopicById(id);

      if (!topic) {
        throw new NotFoundException('Topic not found');
      }

      return topic;

    } catch (error) {
      if (error instanceof NotFoundException) throw error;
      throw new BadRequestException('Topic not found');
    }
  }

  /*
  |--------------------------------------------------------------------------
  | Update Topic by id
  |--------------------------------------------------------------------------
  */
  async update(id: string, dto: UpdateTopicDto) {
    try {

      await this.findById(id);

      if (dto.slug) {
        const exists = await this.topicRepository.existsBySlug(dto.slug);
        if (exists) throw new BadRequestException('The new slug is already taken');
      }

      return this.topicRepository.updateTopic(id, dto);
    } catch (error) {
      console.log(error);
      if (error instanceof NotFoundException || error instanceof BadRequestException) throw error;
      throw new BadRequestException('Update failed');
    }
  }

  async delete(id: string) {
    try {
      await this.findById(id);

      return await this.topicRepository.deleteTopic(id);
    } catch (error) {
      if (error instanceof NotFoundException) throw error;
      throw new BadRequestException('Delete failed');
    }
  }
}
