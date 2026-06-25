import { IsString, IsBoolean, IsNotEmpty } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class TrueFalseOptionsDto {
  @ApiProperty({ example: 'Yes', description: 'Label for the true option' })
  @IsString()
  @IsNotEmpty()
  trueLabel: string = 'True';

  @ApiProperty({ example: 'No', description: 'Label for the false option' })
  @IsString()
  @IsNotEmpty()
  falseLabel: string = 'False';
}

export class TrueFalseAnswerDto {
  @ApiProperty({ example: true, description: 'Boolean value indicating true or false' })
  @IsBoolean()
  value!: boolean;
}
