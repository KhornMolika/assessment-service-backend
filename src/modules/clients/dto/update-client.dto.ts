import { PartialType, OmitType } from '@nestjs/swagger';
import { CreateClientDto } from './create-client.dto';

// slug is immutable after creation — omit it from updates
export class UpdateClientDto extends PartialType(
  OmitType(CreateClientDto, ['slug'] as const),
) {}
