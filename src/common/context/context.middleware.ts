import {
  Injectable,
  NestMiddleware,
  UnauthorizedException,
} from '@nestjs/common';
import { requestContextStorage } from './request-context';

// extracts clientId from x-client-id
@Injectable()
export class ContextMiddleware implements NestMiddleware {
  use(req: any, res: any, next: () => void) {
    const clientId = req.headers['x-client-id'] as string;

    if (!clientId) {
      throw new UnauthorizedException('Missing client id');
    }

    requestContextStorage.run({ clientId }, () => next());
  }
}
