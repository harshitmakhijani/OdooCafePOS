import { firstValueFrom, of } from 'rxjs';
import type { CallHandler, ExecutionContext } from '@nestjs/common';
import { ResponseInterceptor, Paginated } from './response.interceptor';

/**
 * Locks the PRD §16.4 success-envelope contract: EVERY response is wrapped as
 * `{ data }` (and `{ data, meta }` for Paginated). Clients must therefore read
 * `res.data.data` — the exact rule the F3–F6 frontend envelope bugs violated.
 */
describe('ResponseInterceptor', () => {
  const interceptor = new ResponseInterceptor();
  const ctx = {} as ExecutionContext;
  const handlerReturning = (value: unknown): CallHandler => ({
    handle: () => of(value),
  });

  it('wraps a plain object payload under `data`', async () => {
    const payload = { currentSession: null, lastSessionDate: null };
    const result = await firstValueFrom(interceptor.intercept(ctx, handlerReturning(payload)));
    expect(result).toEqual({ data: payload });
    // The payload is one level deep — reading result.currentSession would be undefined.
    expect((result as unknown as Record<string, unknown>).currentSession).toBeUndefined();
  });

  it('wraps a nested result (e.g. session close) under `data`', async () => {
    const payload = { session: { id: 's1' }, summary: { orderCount: 2, totalSales: '100.00' } };
    const result = await firstValueFrom(interceptor.intercept(ctx, handlerReturning(payload)));
    expect(result).toEqual({ data: payload });
    expect(result.data).toHaveProperty('summary');
  });

  it('splits a Paginated payload into `data` + `meta`', async () => {
    const items = [{ id: 'a' }, { id: 'b' }];
    const meta = { page: 1, pageSize: 20, total: 2, totalPages: 1 };
    const result = await firstValueFrom(
      interceptor.intercept(ctx, handlerReturning(new Paginated(items, meta))),
    );
    expect(result).toEqual({ data: items, meta });
  });

  it('does not double-wrap (Paginated.data is not itself an envelope)', async () => {
    const items = [{ id: 'a' }];
    const result = await firstValueFrom(
      interceptor.intercept(ctx, handlerReturning(new Paginated(items, {}))),
    );
    expect(Array.isArray(result.data)).toBe(true);
    expect((result.data as unknown[])[0]).toEqual({ id: 'a' });
  });
});
