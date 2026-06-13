import { CallHandler, ExecutionContext, Injectable, NestInterceptor } from '@nestjs/common';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';
import type { PaginationMeta, SuccessEnvelope } from '@cafe-pos/types';

/**
 * Marker class for handlers that need to return pagination/extra meta alongside
 * their data. Returning `new Paginated(items, meta)` yields `{ data, meta }`;
 * returning a raw value yields `{ data }`.
 */
export class Paginated<T> {
  constructor(
    public readonly data: T,
    public readonly meta: PaginationMeta | Record<string, unknown>,
  ) {}
}

/**
 * Wraps every successful response in the PRD §16.4 success envelope
 * `{ data, meta? }`. Errors are handled by AllExceptionsFilter instead.
 */
@Injectable()
export class ResponseInterceptor<T> implements NestInterceptor<T, SuccessEnvelope<T>> {
  intercept(_context: ExecutionContext, next: CallHandler<T>): Observable<SuccessEnvelope<T>> {
    return next.handle().pipe(
      map((payload): SuccessEnvelope<T> => {
        if (payload instanceof Paginated) {
          return { data: payload.data, meta: payload.meta };
        }
        return { data: payload as T };
      }),
    );
  }
}
