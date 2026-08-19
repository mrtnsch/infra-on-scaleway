import { Link, useRouter } from '@tanstack/react-router'
import type { ErrorComponentProps } from '@tanstack/react-router'
import type { FallbackProps } from 'react-error-boundary'
import type { ReactNode } from 'react'
import { Button } from '#/components/ui/button'

/**
 * App-wide full-page states, wired into the router (`defaultErrorComponent`,
 * `defaultNotFoundComponent` in `router.tsx`) and the top-level React error
 * boundary in `main.tsx`.
 *
 * Layering:
 * - A throw inside a route component / loader / beforeLoad → `RouteErrorComponent`.
 * - An unmatched URL, or a route calling `notFound()` → `NotFoundComponent`.
 * - A crash *outside* the router (provider or env init) → `RootErrorFallback`.
 */

function report(error: unknown) {
  console.error('[app-boundary]', error)
}

function FullPageMessage({
  kicker,
  title,
  message,
  actions,
}: {
  kicker: string
  title: string
  message: string
  actions: ReactNode
}) {
  return (
    <div className="flex min-h-[60vh] flex-col items-center justify-center gap-6 p-6">
      <div className="max-w-md text-center">
        <p className="text-sm font-semibold tracking-widest text-muted-foreground uppercase">
          {kicker}
        </p>
        <h1 className="mt-2 text-3xl font-bold">{title}</h1>
        <p className="mt-2 text-muted-foreground">{message}</p>
      </div>
      <div className="flex gap-3">{actions}</div>
    </div>
  )
}

/**
 * Router `defaultErrorComponent`. "Try again" goes through
 * `router.invalidate()` rather than the boundary's own reset, so loaders and
 * queries actually re-run instead of re-rendering the same failed state.
 */
export function RouteErrorComponent({ error }: ErrorComponentProps) {
  const router = useRouter()
  report(error)
  return (
    <FullPageMessage
      kicker="Error"
      title="Something went wrong"
      message="We hit an unexpected error loading this page. Try again, and if it keeps happening, reload."
      actions={
        <>
          <Button variant="outline" onClick={() => void router.invalidate()}>
            Try again
          </Button>
          <Button onClick={() => window.location.reload()}>Reload</Button>
        </>
      }
    />
  )
}

/** Router `defaultNotFoundComponent` — styled 404 for any unmatched URL. */
export function NotFoundComponent() {
  return (
    <FullPageMessage
      kicker="404"
      title="Nothing to laugh at here"
      message="That page doesn't exist. The catalogue, however, does."
      actions={
        <Button asChild>
          <Link to="/">Back to the jokes</Link>
        </Button>
      }
    />
  )
}

/**
 * Top-level React error boundary fallback, outside the router — a broken
 * provider or a failed env validation. Only a reload can recover, since the
 * app tree itself never mounted.
 */
export function RootErrorFallback({ error }: FallbackProps) {
  report(error)
  return (
    <div className="min-h-screen bg-background text-foreground">
      <FullPageMessage
        kicker="Error"
        title="The app failed to start"
        message="An unexpected error stopped the app from loading. Reloading usually fixes it."
        actions={
          <Button onClick={() => window.location.reload()}>Reload</Button>
        }
      />
    </div>
  )
}
