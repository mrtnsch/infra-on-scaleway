import { HeadContent, Outlet, createRootRoute } from '@tanstack/react-router'

import '../styles.css'

import { TanStackDevtools } from '@tanstack/react-devtools'
import { TanStackRouterDevtoolsPanel } from '@tanstack/react-router-devtools'
import { ReactQueryDevtoolsPanel } from '@tanstack/react-query-devtools'
import { AppShell } from '#/components/app-shell'
import { Toaster } from '#/components/ui/sonner'

const SHOW_DEVTOOLS = import.meta.env.DEV && import.meta.env.MODE !== 'test'

export const Route = createRootRoute({
  head: () => ({
    meta: [
      // Default title for any route that doesn't set its own. A child's `head`
      // fully replaces the title — the router keeps only the innermost one,
      // there is no automatic "Child | Parent" composition — so each route
      // below spells out its full title.
      { title: 'Joke catalogue' },
      {
        name: 'description',
        content:
          'A small catalogue of jokes. Browse, draw one at random, or add your own.',
      },
    ],
  }),
  component: RootComponent,
})

function RootComponent() {
  return (
    <>
      {/* Renders the merged <title>/<meta> of the active match chain. React 19
          hoists them into <head>; index.html deliberately carries no <title>. */}
      <HeadContent />
      <AppShell>
        <Outlet />
      </AppShell>
      <Toaster />
      {/* Dev only: keeps the panels out of the production bundle, and out of
          jsdom — the devtools' unmount path throws there, which fails any
          render test that touches this tree. */}
      {SHOW_DEVTOOLS ? (
        <TanStackDevtools
          config={{ position: 'bottom-right' }}
          plugins={[
            {
              name: 'TanStack Router',
              render: <TanStackRouterDevtoolsPanel />,
            },
            { name: 'TanStack Query', render: <ReactQueryDevtoolsPanel /> },
          ]}
        />
      ) : null}
    </>
  )
}
