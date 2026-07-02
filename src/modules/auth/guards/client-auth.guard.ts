import {
  ExecutionContext,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { AuthGuard } from '@nestjs/passport';
import { IS_PUBLIC_KEY } from './public.decorator';
import { IS_ALLOW_WIDGET_KEY } from './allow-widget.decorator';

@Injectable()
export class ClientAuthGuard extends AuthGuard('jwt') {
  constructor(private readonly reflector: Reflector) {
    super();
  }

  canActivate(context: ExecutionContext) {
    const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);
    if (isPublic) return true;
    return super.canActivate(context);
  }

  handleRequest(
    err: any,
    client: any,
    info: any,
    context: ExecutionContext,
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    status?: any,
  ) {
    if (err || !client) {
      throw (
        err ||
        new UnauthorizedException(
          'Authentication failed: Invalid or missing client token',
        )
      );
    }

    const request = context.switchToHttp().getRequest();
    const jwtPayload = request.jwtPayload;

    // Check widget scope
    const isAllowWidget = this.reflector.getAllAndOverride<boolean>(
      IS_ALLOW_WIDGET_KEY,
      [context.getHandler(), context.getClass()],
    );

    if (jwtPayload?.scopes?.includes('widget')) {
      if (!isAllowWidget) {
        throw new UnauthorizedException(
          'Access Denied: Embed tokens are not allowed on this endpoint.',
        );
      }

      // Origin checking
      if (jwtPayload.origin) {
        const reqOrigin = request.headers.origin;
        // In some environments, origin might not be sent on same-origin requests,
        // but since embed tokens are specifically for cross-origin, we require it to match.
        // If testing in postman, origin might be missing.
        if (reqOrigin && reqOrigin !== jwtPayload.origin) {
          throw new UnauthorizedException(
            'Access Denied: Invalid Origin for this embed token.',
          );
        }
      }
    }

    request.client = client;
    return client;
  }
}
