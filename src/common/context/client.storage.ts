import { AsyncLocalStorage } from 'node:async_hooks';

export interface ClientStore {
  clientId: string;
}

export const clientStorage = new AsyncLocalStorage<ClientStore>();
