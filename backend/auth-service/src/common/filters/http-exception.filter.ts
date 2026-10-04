import {
  ArgumentsHost,
  Catch,
  ExceptionFilter,
  HttpException,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { Request, Response } from 'express';

/** Stable identifiers sent in the `code` field so clients do not parse messages. */
export const ErrorCode = {
  USER_INACTIVE: 'USER_INACTIVE',
} as const;

interface ErrorShape {
  statusCode: number;
  message: string | string[];
  error: string;
  code?: string;
}

function asRecord(value: unknown): Record<string, unknown> | undefined {
  if (typeof value !== 'object' || value === null || Array.isArray(value)) {
    return undefined;
  }
  return value as Record<string, unknown>;
}

function isStringArray(value: unknown[]): value is string[] {
  return value.every((item) => typeof item === 'string');
}

function readErrorMessage(value: unknown): string | string[] | undefined {
  if (typeof value === 'string') {
    return value;
  }
  if (Array.isArray(value) && isStringArray(value)) {
    return value;
  }
  return undefined;
}

function httpStatusLabel(statusCode: number): string {
  const label = HttpStatus[statusCode];
  return typeof label === 'string' ? label : 'Error';
}

function fromHttpException(exception: HttpException): ErrorShape {
  const statusCode = exception.getStatus();
  const body: unknown = exception.getResponse();
  if (typeof body === 'string') {
    return { statusCode, message: body, error: httpStatusLabel(statusCode) };
  }

  const record = asRecord(body);
  return {
    statusCode,
    message: readErrorMessage(record?.message) ?? exception.message,
    error:
      typeof record?.error === 'string'
        ? record.error
        : httpStatusLabel(statusCode),
    ...(typeof record?.code === 'string' && { code: record.code }),
  };
}

function fromPrismaError(
  exception: Prisma.PrismaClientKnownRequestError,
): ErrorShape | undefined {
  switch (exception.code) {
    case 'P2002':
      return {
        statusCode: HttpStatus.CONFLICT,
        message: 'Resource already exists',
        error: 'Conflict',
      };
    case 'P2003':
      return {
        statusCode: HttpStatus.CONFLICT,
        message: 'Resource is referenced by other records',
        error: 'Conflict',
      };
    case 'P2025':
      return {
        statusCode: HttpStatus.NOT_FOUND,
        message: 'Resource not found',
        error: 'Not Found',
      };
    default:
      return undefined;
  }
}

@Catch()
export class HttpExceptionFilter implements ExceptionFilter {
  private readonly logger = new Logger(HttpExceptionFilter.name);

  catch(exception: unknown, host: ArgumentsHost): void {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const request = ctx.getRequest<Request>();

    let shape: ErrorShape | undefined;
    if (exception instanceof HttpException) {
      shape = fromHttpException(exception);
    } else if (exception instanceof Prisma.PrismaClientKnownRequestError) {
      shape = fromPrismaError(exception);
    }

    if (!shape) {
      shape = {
        statusCode: HttpStatus.INTERNAL_SERVER_ERROR,
        message: 'Internal server error',
        error: 'Internal Server Error',
      };
    }

    if (shape.statusCode >= HttpStatus.INTERNAL_SERVER_ERROR) {
      this.logger.error(
        `${request.method} ${request.url}`,
        exception instanceof Error ? exception.stack : String(exception),
      );
    }

    response.status(shape.statusCode).json({
      ...shape,
      timestamp: new Date().toISOString(),
      path: request.url,
    });
  }
}
