import type { RequestHandler } from 'msw';

/**
 * MSW request handlers (base prompt §6). Intentionally empty — ready to extend
 * so the frontend can develop against typed mocks before the backend lands
 * (PRD §18 "contract-first"). Add `http.get('/api/...', ...)` handlers here.
 */
export const handlers: RequestHandler[] = [];
