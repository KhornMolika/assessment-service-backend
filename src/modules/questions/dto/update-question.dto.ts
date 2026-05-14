import { PartialType } from '@nestjs/swagger';
import { CreateQuestionDto } from './create-question.dto';

export class UpdateQuestionBankDto extends PartialType(CreateQuestionDto) {}
