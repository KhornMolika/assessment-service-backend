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
    const { timingSafeEqual } = require('crypto');
    const bufA = Buffer.alloc(b.length, 0);
    const bufB = Buffer.from(b);
    bufA.write(a);
    return timingSafeEqual(bufA, bufB);
  }
}
