import { PartialType } from '@nestjs/mapped-types';
import { CreateQuestionTypeDto } from './create-question-type.dto';

export class UpdateQuestionTypeDto extends PartialType(CreateQuestionTypeDto) {}
