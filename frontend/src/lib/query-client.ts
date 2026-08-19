import { QueryClient } from '@tanstack/react-query'
import { ApiError } from '#/lib/api-error'

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 30_000,
      // A 4xx will not succeed on a retry — a 404 from /jokes/random means the
      // catalogue is empty, and a 400 means the request itself is wrong.
      // Retrying them only delays the empty state. Transient/server failures
      // get one retry.
      retry: (failureCount, error) => {
        if (
          error instanceof ApiError &&
          error.status >= 400 &&
          error.status < 500
        ) {
          return false
        }
        return failureCount < 1
      },
      refetchOnWindowFocus: false,
    },
  },
})
