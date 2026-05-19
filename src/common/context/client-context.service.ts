import { UnauthorizedException } from '@nestjs/common';
import { clientStorage } from './client.storage';

export class ClientContextService {
  static getClientId(): string {
    const store = clientStorage.getStore();

    if (!store?.clientId) {
      throw new UnauthorizedException('No client context');
    }

    return store.clientId;
  }
}
