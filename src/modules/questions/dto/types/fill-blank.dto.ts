import { IsString, IsNotEmpty, IsObject, IsArray } from 'class-validator';

export class FillBlankSettingsDto {
  @IsString()
  @IsNotEmpty()
  template!: string; // e.g., "NestJS is a [blank_1] framework built on [blank_2]."
}

export class FillBlankAnswerDto {
  @IsObject()
  blanks!: Record<string, string[]>; // Maps blank keys to arrays of acceptable case strings
}