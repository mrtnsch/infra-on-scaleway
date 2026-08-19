import '@testing-library/jest-dom/vitest'
import { cleanup } from '@testing-library/react'
import { afterEach } from 'vitest'

// jsdom declares `window.matchMedia` but does not implement it. Sonner asks for
// the colour scheme on mount and the toaster is on every page via __root, so
// without this every render test dies before reaching what it is testing.
// Defined on `window` rather than via `vi.stubGlobal`, because a test that
// calls `vi.unstubAllGlobals()` (index.test.tsx does, to drop its fetch stub)
// would otherwise take this with it.
Object.defineProperty(window, 'matchMedia', {
  writable: true,
  value: (query: string) => ({
    matches: false,
    media: query,
    onchange: null,
    addEventListener: () => {},
    removeEventListener: () => {},
    addListener: () => {},
    removeListener: () => {},
    dispatchEvent: () => false,
  }),
})

// The router restores scroll position on navigation; jsdom has no scrollTo and
// logs a "Not implemented" line for every one. Nothing asserts on scrolling.
window.scrollTo = () => {}

// `globals: true` gives us describe/it/expect; unmounting between tests is
// still ours to do.
afterEach(cleanup)
