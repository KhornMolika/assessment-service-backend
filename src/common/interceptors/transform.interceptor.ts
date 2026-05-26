import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
} from '@nestjs/common';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';

@Injectable()
export class TransformInterceptor<T> implements NestInterceptor {
  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    const ctx = context.switchToHttp();
    const response = ctx.getResponse();
    const request = ctx.getRequest();

    return next.handle().pipe(
      map((result) => {
        const baseResponse = {
          success: true,
          statusCode: response.statusCode,
          timestamp: new Date().toISOString(),
          path: request.url,
        };

        // Case 1: Paginated responses
        if (result && result.meta && Array.isArray(result.data)) {
          return {
            ...baseResponse,
            meta: result.meta,
            data: this.sanitizeData(result.data),
          };
        }

        // Case 2: Standard single object responses
        return {
          ...baseResponse,
          data:
            result !== undefined && result !== null
              ? this.sanitizeData(result)
              : { message: 'Action executed successfully' },
        };
      }),
    );
  }

  // CENTRALIZED SAFETY NET: Strips internal tenant keys from output payloads
  private sanitizeData(data: any): any {
    if (!data) return data;

    // Handle array collections recursively
    if (Array.isArray(data)) {
      return data.map((item) => this.sanitizeData(item));
    }

    // Process object properties safely
    if (typeof data === 'object') {
      // Create a shallow copy to prevent mutation errors
      const cleaned = { ...data };

      // Enforce removal of sensitive columns explicitly
      delete cleaned.clientId;
      delete cleaned.deletedAt;

      return cleaned;
    }

    return data;
  }
}
