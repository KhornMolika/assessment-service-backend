import { IsString, IsNotEmpty, IsEnum, IsOptional } from 'class-validator';

export enum RoomRole {
  HOST = 'host',
  PARTICIPANT = 'participant',
}

export class JoinRoomDto {
  @IsString()
  @IsNotEmpty()
  roomId!: string; // assessmentId

  @IsString()
  @IsOptional()
  participantId?: string; // optional for host

  @IsEnum(RoomRole)
  role!: RoomRole;
}
