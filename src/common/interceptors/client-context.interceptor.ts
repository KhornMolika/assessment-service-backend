import {
  CallHandler,
  ExecutionContext,
  Injectable,
  NestInterceptor,
} from '@nestjs/common';
import { Observable } from 'rxjs';
import { clientStorage } from '../context/client.storage';
import { Client } from '../../modules/clients/client.entity';

@Injectable()
export class ClientContextInterceptor implements NestInterceptor {
  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    const request = context.switchToHttp().getRequest();
    const client: Client | undefined = request.user; // populated by ClientAuthGuard

    if (client && client.clientId) {
      return new Observable((subscriber) => {
        clientStorage.run({ clientId: client.clientId }, () => {
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
