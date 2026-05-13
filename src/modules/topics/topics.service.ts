import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { TopicRepository } from './repositories/topic.repository';
import { CreateTopicDto } from './dto/create-topic.dto';
import { UpdateTopicDto } from './dto/update-topic.dto';
import slugify from 'slugify';

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
      const slug = this.generateSlug(dto.name);
      
      const exists = await this.topicRepository.findOne({ slug } as any);

      if (exists) throw new BadRequestException('Topic slug already exists');

      return await this.topicRepository.create ({
        ...dto,
        slug
      });

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
      return this.topicRepository.findAll();
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
      const topic = await this.topicRepository.findOne({ id } as any);

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

      const updateData: any = { ...dto };

      if (dto.name) {
        const slug = this.generateSlug(dto.name);

        // Ensure new slug is not taken by another topic record
        const exists = await this.topicRepository.findOne({ slug} as any);

        if (exists && exists.id !== id) throw new BadRequestException('The new name is already taken');

        updateData.slug = slug;
      }
      
      await this.topicRepository.update({ id } as any, updateData);
      return this.findById(id);

    } catch (error) {
      console.log(error);
      if (error instanceof NotFoundException || error instanceof BadRequestException) throw error;
      throw new BadRequestException('Update failed');
    }
  }

  async delete(id: string) {
    try {
      await this.findById(id);

      return await this.topicRepository.softDelete({ id } as any);
    } catch (error) {
      if (error instanceof NotFoundException) throw error;
      throw new BadRequestException('Delete failed');
    }
  }

  /*
  |--------------------------------------------------------------------------
  | Helper Utilities
  |--------------------------------------------------------------------------
  */
  private generateSlug(name: string): string {
    return slugify(name, {
      lower: true,
      strict: true,
    });
  }
}
