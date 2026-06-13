import { QueryClient } from '@tanstack/react-query';

/** Shared TanStack Query client — the server cache for all REST data (PRD §4). */
export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 1,
      refetchOnWindowFocus: false,
      staleTime: 30_000,
    },
  },
});
