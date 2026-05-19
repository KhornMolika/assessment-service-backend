import { IsString, IsNotEmpty } from 'class-validator';

export class KeyedOptionDto {
  @IsString()
  @IsNotEmpty()
  id!: string; // e.g., "opt_1"

  @IsString()
  @IsNotEmpty()
  text!: string; // e.g., "Node.js runs on V8"
}