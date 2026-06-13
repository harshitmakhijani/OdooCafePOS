import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import './index.css';

/**
 * Start MSW in dev only. Wrapped so a missing service-worker file never blocks
 * boot — run `pnpm --filter @cafe-pos/web exec msw init public` to enable mocks.
 */
async function enableMocking(): Promise<void> {
  if (!import.meta.env.DEV) return;
  try {
    const { worker } = await import('./mocks/browser');
    await worker.start({ onUnhandledRequest: 'bypass' });
  } catch (err) {
    // eslint-disable-next-line no-console
    console.warn('[msw] mock worker not started:', err);
  }
}

void enableMocking().finally(() => {
  ReactDOM.createRoot(document.getElementById('root') as HTMLElement).render(
    <React.StrictMode>
      <App />
    </React.StrictMode>,
  );
});
