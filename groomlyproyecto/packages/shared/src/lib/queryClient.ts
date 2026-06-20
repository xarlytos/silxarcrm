import { QueryClient } from '@tanstack/react-query';

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 2 * 60 * 1000,        // 2 min
      gcTime: 10 * 60 * 1000,          // 10 min en caché
      retry: (failureCount, error: unknown) => {
        const status = (error as { response?: { status?: number } } | null)?.response?.status;
        if (status === 401 || status === 403 || status === 404) return false;
        return failureCount < 2;
      },
      refetchOnWindowFocus: false,
      networkMode: 'offlineFirst',     // Sirve cache primero, refetch en background
    },
    mutations: {
      retry: false,
      networkMode: 'offlineFirst',
    },
  },
});
