import { Injectable, NestMiddleware, UnauthorizedException } from '@nestjs/common';
import { Request, Response, NextFunction } from 'express';
import { isUUID } from 'class-validator';
import { clientStorage } from '../context/client.storage';

@Injectable()
export class ClientMiddleware implements NestMiddleware {
  use(req: Request, res: Response, next: NextFunction): void {
    const clientId = req.headers['x-client-id'] as string;

    if (!clientId || !isUUID(clientId)) {
      throw new UnauthorizedException('Invalid or missing client context');
    }

    clientStorage.run({ clientId }, () => next());
  }
}
