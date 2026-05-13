import { Injectable, Scope, UnauthorizedException } from '@nestjs/common';
import { Inject } from '@nestjs/common';
import { REQUEST } from '@nestjs/core';

@Injectable({ scope: Scope.REQUEST })
export class RequestContext {
  constructor(@Inject(REQUEST) private readonly req: any) {}

  get clientId(): string {
    const clientId = this.req.headers['x-client-id'];

    if (!clientId) {
      throw new UnauthorizedException('Missing client id');
    }

    return clientId;
  }
}