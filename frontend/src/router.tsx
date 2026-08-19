import { createRouter } from '@tanstack/react-router'
import { routeTree } from './routeTree.gen'
import {
  NotFoundComponent,
  RouteErrorComponent,
} from '#/components/app-boundaries'

export const router = createRouter({
  routeTree,
  defaultPreload: 'intent',
  scrollRestoration: true,
  defaultPreloadStaleTime: 0,
  // App-wide fallbacks, so a route throw or an unmatched URL renders a real
  // screen instead of a white page.
  defaultErrorComponent: RouteErrorComponent,
  defaultNotFoundComponent: NotFoundComponent,
})

declare module '@tanstack/react-router' {
  interface Register {
    router: typeof router
  }
}
