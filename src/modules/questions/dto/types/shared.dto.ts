import { IsString, IsNotEmpty } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class KeyedOptionDto {
  @ApiProperty({
    example: 'opt_1',
    description: 'Unique identifier for the option',
  })
  @IsString()
  @IsNotEmpty()
  id!: string; // e.g., "opt_1"

  @ApiProperty({
    example: 'Node.js runs on V8',
    description: 'Text content of the option',
  })
  @IsString()
  @IsNotEmpty()
  text!: string; // e.g., "Node.js runs on V8"
}
