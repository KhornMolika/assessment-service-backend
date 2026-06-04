import { ThrottlerGuard, ThrottlerRequest } from '@nestjs/throttler';
import { ExecutionContext, Injectable } from '@nestjs/common';

@Injectable()
export class AuthThrottlerGuard extends ThrottlerGuard {
  protected async handleRequest(
    requestProps: ThrottlerRequest,
  ): Promise<boolean> {
    // Only run the auth throttlers for this guard, skip all others
    const { throttler } = requestProps;
    if (throttler.name !== 'auth' && throttler.name !== 'authBurst') {
      return true;
    }
    return super.handleRequest(requestProps);
  }

  protected async getTracker(req: Record<string, any>): Promise<string> {
    const clientId = req.body?.clientId;
    if (clientId && typeof clientId === 'string') {
      // Per-clientId limit — precise, not affected by NAT
      return `clientId:${clientId}`;
    }
    // Fallback to IP for requests without a clientId (enumeration attempts)
    return req.ip ?? 'unknown';
  }
}
