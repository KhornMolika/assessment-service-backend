import { createParamDecorator, ExecutionContext } from '@nestjs/common';
import { Client } from '../../modules/clients/client.entity';

export const CurrentClient = createParamDecorator(
  (_: unknown, ctx: ExecutionContext): Client => {
    return ctx.switchToHttp().getRequest().user;
  },
);
