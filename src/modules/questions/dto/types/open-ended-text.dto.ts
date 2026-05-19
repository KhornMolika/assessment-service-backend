import { IsInt, Min, Max, IsArray, IsString, IsNotEmpty } from 'class-validator';

export class OpenEndedTextSettingsDto {
  @IsInt()
  @Min(0)
  minWords: number = 0; // Set to 0 for short answers if word count isn't strictly enforced

  @IsInt()
  @Max(5000)
  maxWords!: number; // e.g., 50 for short answer, 1000 for essay
}

export class OpenEndedTextAnswerDto {
  @IsString()
  @IsNotEmpty()
  modelAnswerReference!: string;

  @IsArray()
  @IsString({ each: true })
  @IsNotEmpty({ each: true })
  keyPointsExpected!: string[];
}