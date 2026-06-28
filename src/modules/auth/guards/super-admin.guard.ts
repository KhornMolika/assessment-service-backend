import {
  CanActivate,
  ExecutionContext,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Request } from 'express';

@Injectable()
export class SuperAdminGuard implements CanActivate {
  constructor(private readonly config: ConfigService) {}

  canActivate(context: ExecutionContext): boolean {
    const req = context.switchToHttp().getRequest<Request>();
    const key = req.headers['x-admin-api-key'];
    const expected = this.config.getOrThrow<string>('admin.apiKey');

    // Constant-time comparison — prevents timing attacks
    if (!key || !this.safeCompare(String(key), expected)) {
      throw new UnauthorizedException('Invalid or missing admin API key');
    }

    return true;
  }

  // crypto.timingSafeEqual requires equal-length buffers
  private safeCompare(a: string, b: string): boolean {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const { timingSafeEqual, createHash } = require('crypto');
    const hashA = createHash('sha256').update(a).digest();
    const hashB = createHash('sha256').update(b).digest();
    return timingSafeEqual(hashA, hashB);
  }
}
