import {
  CallHandler,
  ExecutionContext,
  Injectable,
  NestInterceptor,
} from '@nestjs/common';
import { Observable } from 'rxjs';
import { clientStorage } from '../context/client.storage';

@Injectable()
export class WsClientContextInterceptor implements NestInterceptor {
  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    const client = context.switchToWs().getClient();
    // Get clientId from handshake auth or headers
    const clientId =
      client.handshake?.auth?.clientId ||
      client.handshake?.headers?.['x-client-id'] ||
      client.handshake?.query?.clientId;

    if (clientId) {
      return new Observable((subscriber) => {
        clientStorage.run({ clientId }, () => {
          next.handle().subscribe({
            next: (value) => subscriber.next(value),
            error: (err) => subscriber.error(err),
            complete: () => subscriber.complete(),
          });
        });
      });
    }

    return next.handle();
  }
}
