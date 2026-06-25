import { IsString, IsNotEmpty, IsEnum, IsOptional } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export enum RoomRole {
  HOST = 'host',
  PARTICIPANT = 'participant',
}

export class JoinRoomDto {
  @ApiProperty({ example: '123e4567-e89b-12d3-a456-426614174000', description: 'The ID of the room or assessment' })
  @IsString()
  @IsNotEmpty()
  roomId!: string; // assessmentId

  @ApiProperty({ example: '123e4567-e89b-12d3-a456-426614174000', description: 'The ID of the participant', required: false })
  @IsString()
  @IsOptional()
  participantId?: string; // optional for host

  @ApiProperty({ enum: RoomRole, example: RoomRole.PARTICIPANT, description: 'The role of the user in the room' })
  @IsEnum(RoomRole)
  role!: RoomRole;

  @ApiProperty({ required: false })
  @IsString()
  @IsOptional()
  name?: string;
}