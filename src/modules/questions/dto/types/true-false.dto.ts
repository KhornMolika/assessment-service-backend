import { IsString, IsBoolean, IsNotEmpty } from 'class-validator';

export class TrueFalseSettingsDto {
  @IsString()
  @IsNotEmpty()
  trueLabel: string = 'True';

  @IsString()
  @IsNotEmpty()
  falseLabel: string = 'False';
}

export class TrueFalseAnswerDto {
  @IsBoolean()
  value!: boolean;
}