import {
  RouterProvider,
  createMemoryHistory,
  createRouter,
} from '@tanstack/react-router'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { render, screen } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { routeTree } from '#/routeTree.gen'
import type { JokePage } from '#/generated/api/model'

/**
 * The one wiring test: router → route → generated hook → orval mutator → fetch.
 * It is deliberately not about the markup. If this passes, the seams all line
 * up; if it fails, one of them came apart.
 */

const page: JokePage = {
  items: [
    {
      id: '11111111-1111-1111-1111-111111111111',
      content: 'Why do programmers prefer dark mode? Light attracts bugs.',
      category: 'PROGRAMMING',
      createdAt: '2026-08-19T10:00:00Z',
    },
  ],
  page: 0,
  size: 20,
  totalElements: 1,
  totalPages: 1,
}

function renderApp(url: string) {
  const router = createRouter({
    routeTree,
    history: createMemoryHistory({ initialEntries: [url] }),
  })
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  })

  return render(
    <QueryClientProvider client={queryClient}>
      {/* The module-level `router` in src/router.tsx is a singleton with a
          browser history; tests build their own so each one starts clean. */}
      <RouterProvider router={router} />
    </QueryClientProvider>,
  )
}

afterEach(() => vi.unstubAllGlobals())

describe('the catalogue route', () => {
  it('renders the jokes the API returns', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(
        () =>
          new Response(JSON.stringify(page), {
            status: 200,
            headers: { 'content-type': 'application/json' },
          }),
      ),
    )

    renderApp('/')

    expect(
      await screen.findByText(/Light attracts bugs/, undefined, {
        timeout: 3000,
      }),
    ).toBeInTheDocument()
    // Scoped to the badge: "Programming" is also a filter chip in the header.
    expect(
      screen.getByText('Programming', { selector: '[data-slot="badge"]' }),
    ).toBeInTheDocument()
  })

  it('shows the empty state rather than a blank page', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(
        () =>
          new Response(
            JSON.stringify({
              ...page,
              items: [],
              totalElements: 0,
              totalPages: 0,
            }),
            { status: 200, headers: { 'content-type': 'application/json' } },
          ),
      ),
    )

    renderApp('/')

    expect(
      await screen.findByText(/No jokes here yet/, undefined, {
        timeout: 3000,
      }),
    ).toBeInTheDocument()
  })
})
