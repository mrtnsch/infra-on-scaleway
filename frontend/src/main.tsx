import ReactDOM from 'react-dom/client'
import { RouterProvider } from '@tanstack/react-router'
import { QueryClientProvider } from '@tanstack/react-query'
import { ErrorBoundary } from 'react-error-boundary'
import { RootErrorFallback } from '#/components/app-boundaries'
import { queryClient } from '#/lib/query-client'
import { applySystemTheme } from '#/lib/theme'
import { router } from '#/router'

applySystemTheme()

const rootElement = document.getElementById('app')!

if (!rootElement.innerHTML) {
  ReactDOM.createRoot(rootElement).render(
    // Outermost boundary: catches crashes above or around the router — provider
    // setup, or env validation failing at import time. Route-level errors are
    // handled inside by the router's defaultErrorComponent.
    <ErrorBoundary FallbackComponent={RootErrorFallback}>
      <QueryClientProvider client={queryClient}>
        <RouterProvider router={router} />
      </QueryClientProvider>
    </ErrorBoundary>,
  )
}
