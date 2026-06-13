import {
  ArgumentsHost,
  Catch,
  ExceptionFilter,
  HttpException,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import { Prisma } from '@prisma/client';
import type { Response } from 'express';
import type { ErrorEnvelope } from '@cafe-pos/types';

/**
 * Global exception filter — maps any thrown error to the PRD §16.4 envelope:
 * `{ error: { code, message, details? } }` with the correct HTTP status.
 */
@Catch()
export class AllExceptionsFilter implements ExceptionFilter {
  private readonly logger = new Logger(AllExceptionsFilter.name);

  catch(exception: unknown, host: ArgumentsHost): void {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();

    let status = HttpStatus.INTERNAL_SERVER_ERROR;
    let code = 'INTERNAL_ERROR';
    let message = 'Internal server error';
    let details: unknown;

    if (exception instanceof HttpException) {
      status = exception.getStatus();
      code = this.codeForStatus(status);
      const res = exception.getResponse();
      if (typeof res === 'string') {
        message = res;
      } else if (res && typeof res === 'object') {
        const body = res as Record<string, unknown>;
        message =
          (Array.isArray(body.message) ? body.message.join(', ') : (body.message as string)) ??
          exception.message;
        // class-validator failures arrive as a `message` array — surface them as details.
        if (Array.isArray(body.message)) {
          details = body.message;
        }
        if (body.error && typeof body.error === 'string' && code === 'INTERNAL_ERROR') {
          code = String(body.error).toUpperCase().replace(/\s+/g, '_');
        }
      }
    } else if (exception instanceof Prisma.PrismaClientKnownRequestError) {
      // Map common Prisma errors to proper HTTP statuses instead of a raw 500 (PRD §16.4).
      const mapped = this.mapPrismaError(exception);
      status = mapped.status;
      code = this.codeForStatus(status);
      message = mapped.message;
    } else if (exception instanceof Error) {
      message = exception.message;
    }

    if (status >= HttpStatus.INTERNAL_SERVER_ERROR) {
      this.logger.error(exception instanceof Error ? exception.stack : String(exception));
    }

    const envelope: ErrorEnvelope = {
      error: { code, message, ...(details ? { details } : {}) },
    };
    response.status(status).json(envelope);
  }

  private mapPrismaError(err: Prisma.PrismaClientKnownRequestError): {
    status: number;
    message: string;
  } {
    switch (err.code) {
      case 'P2002': {
        const target = (err.meta?.target as string[] | undefined)?.join(', ');
        return {
          status: HttpStatus.CONFLICT,
          message: target
            ? `A record with this ${target} already exists`
            : 'Unique constraint violation',
        };
      }
      case 'P2025':
        return { status: HttpStatus.NOT_FOUND, message: 'Record not found' };
      case 'P2003':
        return {
          status: HttpStatus.CONFLICT,
          message: 'Operation violates a relation constraint (record is still referenced)',
        };
      default:
        return { status: HttpStatus.BAD_REQUEST, message: 'Database request error' };
    }
  }

  private codeForStatus(status: number): string {
    switch (status) {
      case HttpStatus.BAD_REQUEST:
        return 'VALIDATION_ERROR';
      case HttpStatus.UNAUTHORIZED:
        return 'UNAUTHORIZED';
      case HttpStatus.FORBIDDEN:
        return 'FORBIDDEN';
      case HttpStatus.NOT_FOUND:
        return 'NOT_FOUND';
      case HttpStatus.CONFLICT:
        return 'CONFLICT';
      case HttpStatus.UNPROCESSABLE_ENTITY:
        return 'BUSINESS_RULE_VIOLATION';
      case HttpStatus.NOT_IMPLEMENTED:
        return 'NOT_IMPLEMENTED';
      default:
        return status >= 500 ? 'INTERNAL_ERROR' : 'ERROR';
    }
  }
}
