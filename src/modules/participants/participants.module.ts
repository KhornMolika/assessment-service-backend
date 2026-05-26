import { Module, forwardRef } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Participant } from './entities/participant.entity';
import { ParticipantRepository } from './repositories/participant.repository';
import { ParticipantsService } from './participants.service';
import { ParticipantsController } from './participants.controller';

@Module({
  imports: [TypeOrmModule.forFeature([Participant])],
  providers: [ParticipantRepository, ParticipantsService],
  controllers: [ParticipantsController],
  exports: [ParticipantRepository, ParticipantsService],
})
export class ParticipantsModule {}
