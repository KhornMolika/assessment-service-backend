import  { AsyncLocalStorage } from 'node:async_hooks';

// store client id
export interface RequestContext {
  clientId: string;
}

export const requestContextStorage =
  new AsyncLocalStorage<RequestContext>();