import { PartialType } from '@nestjs/swagger';
import { AddParticipantDto } from './add-participant.dto';

export class UpdateParticipantDto extends PartialType(AddParticipantDto) {}
