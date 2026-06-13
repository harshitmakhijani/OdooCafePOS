import { setupWorker } from 'msw/browser';
import { handlers } from './handlers';

/** MSW browser worker (dev only). Started from main.tsx behind a try/catch. */
export const worker = setupWorker(...handlers);
