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
  userId?: string; // participantId — optional for anonymous

  @IsEnum(RoomRole)
  role!: RoomRole;
}
