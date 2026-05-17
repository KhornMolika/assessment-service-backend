import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { TopicRepository } from './repositories/topic.repository';
import { CreateTopicDto } from './dto/create-topic.dto';
import { UpdateTopicDto } from './dto/update-topic.dto';
import slugify from 'slugify';
import { PaginationQueryDto } from '../../common/dto/pagination-query.dto';

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
      const exists = await this.topicRepository.findOne({ name: dto.name } as any);

      if (exists) throw new BadRequestException('Topic name already exists');

      const slug = this.generateSlug(dto.name);

      const topic = await this.topicRepository.create({
        name: dto.name,
        description: dto.description,
        visibility: dto.visibility,
        slug,
      });

      return topic;

    } catch (error) {
      console.log('Error creating topic:', error);
      if (error instanceof BadRequestException) throw error;
      throw new BadRequestException('Failed to create topic');
    }
  }

  /*
  |--------------------------------------------------------------------------
  | Find all topics
  |--------------------------------------------------------------------------
  */
  async findAll(query: PaginationQueryDto) {
    try {
      const [topics, total] = await this.topicRepository.findPaginated(query, [
        'name',
        'description',
      ]);

      return {
        data: topics,
        meta: {
          total,
          page: query.page,
          limit: query.limit,
          pageCount: Math.ceil(total / query.limit),
        },
      };
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
      const topic = await this.topicRepository.findById(id, ['questionBanks', 'assessments', 'questions']);

      if (!topic) {
        throw new NotFoundException('Topic not found');
      }

      const mapped: any = { ...topic };
      mapped.summary = {
        totalQuestions: topic.questions?.length || 0,
        totalQuestionBanks: topic.questionBanks?.length || 0,
        totalAssessments: topic.assessments?.length || 0,
      };

      // Do not return all questions raw in the response per API doc
      delete mapped.questions;
      
      // Map question counts for nested banks/assessments if necessary
      if(mapped.questionBanks) {
        mapped.questionBanks = mapped.questionBanks.map((b: any) => ({
          ...b,
          questionCount: b.questions?.length || 0 // assuming relation loaded or just mock for now
        }));
      }

      if(mapped.assessments) {
        mapped.assessments = mapped.assessments.map((a: any) => ({
          ...a,
          questionCount: a.assessmentQuestions?.length || 0
        }));
      }

      return mapped;

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

      const updateData: any = {};
      if (dto.name) updateData.name = dto.name;
      if (dto.description) updateData.description = dto.description;
      if (dto.visibility) updateData.visibility = dto.visibility;

      if (dto.name) {
        const slug = this.generateSlug(dto.name);

        // Ensure new slug is not taken by another topic record
        const exists = await this.topicRepository.findOne({ slug } as any);

        if (exists && exists.id !== id)
          throw new BadRequestException('The new name is already taken');

        updateData.slug = slug;
      }

      await this.topicRepository.update({ id } as any, updateData);

      return this.findById(id);

    } catch (error) {
      console.log(error);
      if (
        error instanceof NotFoundException ||
        error instanceof BadRequestException
      )
        throw error;
      throw new BadRequestException('Update failed');
    }
  }

  async delete(id: string) {
    try {
      await this.findById(id);

      await this.topicRepository.softDelete({ id } as any);

      return;
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
