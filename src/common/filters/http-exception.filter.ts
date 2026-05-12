import {
  ArgumentsHost,
  Catch,
  ExceptionFilter,
  HttpException,
  HttpStatus,
} from '@nestjs/common';

export enum ErrorCode {
  BAD_REQUEST = 'BAD_REQUEST',
  VALIDATION_ERROR = 'VALIDATION_ERROR',
  NOT_FOUND = 'NOT_FOUND',
  UNAUTHORIZED = 'UNAUTHORIZED',
  FORBIDDEN = 'FORBIDDEN',
  INTERNAL_ERROR = 'INTERNAL_ERROR',
}

function mapStatusToCode(status: number): ErrorCode {
  switch (status) {
    case 400:
      return ErrorCode.BAD_REQUEST;
    case 401:
      return ErrorCode.UNAUTHORIZED;
    case 403:
      return ErrorCode.FORBIDDEN;
    case 404:
      return ErrorCode.NOT_FOUND;
    default:
      return ErrorCode.INTERNAL_ERROR;
  }
}

function normalizeException(exception: unknown) {
  if (!(exception instanceof HttpException)) {
    return {
      code: ErrorCode.INTERNAL_ERROR,
      message: 'Internal server error',
      details: [],
    };
  }

  const res = exception.getResponse();

  // default structure
  let message: string = exception.message;
  let details: string[] = [];

  if (typeof res === 'string') {
    message = res;
  }

  if (typeof res === 'object' && res !== null) {
    const r = res as any;

    message = r.message || message;

    // Nest validation pipe returns array here
    if (Array.isArray(r.message)) {
      details = r.message;
      message = 'Validation failed';
    }

    // fallback
    details = r.details || details;
  }

  return {
    code: mapStatusToCode(exception.getStatus()),
    message,
    details,
  };
}

@Catch()
export class HttpExceptionFilter
  implements ExceptionFilter
{
  catch(exception: unknown, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse();
    const request = ctx.getRequest();

    const status =
      exception instanceof HttpException
        ? exception.getStatus()
        : HttpStatus.INTERNAL_SERVER_ERROR;

    const normalized = normalizeException(exception);

    response.status(status).json({
      success: false,
      error: normalized,
      statusCode: status,
      timestamp: new Date().toISOString(),
      path: request.url,
    });
  }
}