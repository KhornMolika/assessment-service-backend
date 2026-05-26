// -----------------------------------------------------------------------------
// Partial update — all fields optional. Only allowed in DRAFT status.
// -----------------------------------------------------------------------------

import { PartialType } from '@nestjs/swagger';
import { CreateAssessmentDto } from './create-assessment.dto';

export class UpdateAssessmentDto extends PartialType(CreateAssessmentDto) {}
