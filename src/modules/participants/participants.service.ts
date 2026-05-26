import {
  Injectable,
  NotFoundException,
  ConflictException,
  BadRequestException,
} from '@nestjs/common';
import { ParticipantRepository } from './repositories/participant.repository';
import { CreateParticipantDto } from './dto/create-participant.dto';
import { UpdateParticipantDto } from './dto/update-participant.dto';
import { PaginationQueryDto } from '@common/dto/pagination-query.dto';

@Injectable()
export class ParticipantsService {
  constructor(private readonly participantRepository: ParticipantRepository) {}

  /**
   * Returns a paginated list of participants for this client.
   * Supports search by name or email.
   */
  async findAll(query: PaginationQueryDto) {
    try {
      const [data, total] =
        await this.participantRepository.findPaginated(query);
      return {
        data,
        meta: {
          total,
          page: query.page,
          limit: query.limit,
          pageCount: Math.ceil(total / query.limit),
        },
      };
    } catch (error) {
      throw new BadRequestException('Could not fetch participants');
    }
  }

  /**
   * Returns a single participant by ID.
   * Throws 404 if not found.
   */
  async findOne(id: string) {
    try {
      const participant = await this.participantRepository.findById(id);
      if (!participant) throw new NotFoundException('Participant not found');
      return participant;
    } catch (error) {
      if (error instanceof NotFoundException) throw error;
      throw new BadRequestException('Participant not found');
    }
  }

  /**
   * Returns a single participant with their assessment assignment history.
   * Throws 404 if not found.
   */
  // async findOneWithAssessments(id: string) {
  //   try {
  //     const participant =
  //       await this.participantRepository.findOneWithAssessments(id);
  //     if (!participant) throw new NotFoundException('Participant not found');
  //     return participant;
  //   } catch (error) {
  //     if (error instanceof NotFoundException) throw error;
  //     throw new BadRequestException('Participant not found');
  //   }
  // }

  /**
   * Creates a new participant for this client.
   * If email is provided, checks for duplicate email within the same client.
   */
  async create(dto: CreateParticipantDto) {
    try {
      if (dto.email) {
        const existing = await this.participantRepository.findOne({
          email: dto.email,
        });
        if (existing) {
          throw new ConflictException(
            'A participant with this email already exists',
          );
        }
      }

      return this.participantRepository.save(dto);
    } catch (error) {
      console.log('Error creating participant: ', error);
      if (error instanceof BadRequestException) throw error;
      throw new BadRequestException('Could not create participant');
    }
  }

  /**
   * Updates a participant's name, email, or phone.
   * If email is being changed, checks for duplicate within the same client.
   * Throws 404 if participant not found.
   */
  async update(id: string, dto: UpdateParticipantDto) {
    try {
      const participant = await this.findOne(id);

      if (dto.email && dto.email !== participant.email) {
        const existing = await this.participantRepository.findOne({
          email: dto.email,
        });
        if (existing) {
          throw new ConflictException(
            'A participant with this email already exists',
          );
        }
      }

      await this.participantRepository.update({ id }, dto);
      return this.findOne(id);
    } catch (error) {
      console.log('Error update participant: ', error);
      throw new BadRequestException('Could not update participant');
    }
  }

  /**
   * Soft deletes a participant.
   * Throws 404 if participant not found.
   */
  async remove(id: string) {
    try {
      await this.findOne(id);
      await this.participantRepository.softDelete({ id });
      return { id, deletedAt: new Date() };
    } catch (error) {
      if (error instanceof NotFoundException) throw error;
      throw new BadRequestException('Delete failed');
    }
  }
}
