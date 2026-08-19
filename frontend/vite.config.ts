import { defineConfig } from 'vitest/config'
import { loadEnv } from 'vite'
import { devtools } from '@tanstack/devtools-vite'
import { tanstackRouter } from '@tanstack/router-plugin/vite'
import viteReact from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import type { Plugin } from 'vite'

/**
 * Content-Security-Policy, delivered as a `<meta>` tag because the deploy
 * target is a static bucket: there is no server or reverse proxy left to send a
 * real response header. Two consequences worth knowing before trusting it:
 *
 * - **`frame-ancestors` is ignored in a meta tag** (so are `report-uri` and
 *   `sandbox`). Clickjacking protection therefore needs a real header from a
 *   CDN in front — Scaleway Edge Services — alongside the other header-only
 *   defences (`X-Content-Type-Options`, `Referrer-Policy`, HSTS). It is spelled
 *   out below anyway, so that moving this policy to a header later is a copy,
 *   not a rewrite.
 * - **Build-only.** Vite's dev server serves an inline React Fast Refresh
 *   preamble, which `script-src 'self'` would kill. Injecting only on `build`
 *   keeps the shipped policy strict instead of loosening it to accommodate a
 *   dev-only script.
 *
 * `script-src` needs no `'unsafe-inline'`, hash or nonce: the production
 * `index.html` references one external module and nothing else. `style-src`
 * does need `'unsafe-inline'` — React's `style` prop and Radix's positioning
 * both produce inline style *attributes*, which the directive covers.
 */
function cspMeta(apiOrigin: string): Plugin {
  const policy = [
    "default-src 'self'",
    "script-src 'self'",
    "style-src 'self' 'unsafe-inline'",
    "img-src 'self' data:",
    "font-src 'self'",
    `connect-src 'self' ${apiOrigin}`,
    "base-uri 'self'",
    "form-action 'self'",
    "frame-ancestors 'none'",
    "object-src 'none'",
  ].join('; ')

  return {
    name: 'csp-meta',
    apply: 'build',
    transformIndexHtml: () => [
      {
        tag: 'meta',
        attrs: { 'http-equiv': 'Content-Security-Policy', content: policy },
        injectTo: 'head-prepend',
      },
    ],
  }
}

/**
 * The API origin the SPA is allowed to talk to, for `connect-src`. Derived from
 * the same build-time variable the app itself uses, so the policy cannot drift
 * from the backend it was built against — and only the origin, since a CSP
 * source with a path would silently constrain more than intended.
 */
function apiOriginFor(mode: string): string {
  const url = loadEnv(mode, process.cwd(), 'VITE_').VITE_API_BASE_URL
  try {
    return new URL(url).origin
  } catch {
    // Failing the build beats shipping a policy that blocks every API call, or
    // a bundle that resolves `undefined/jokes` at runtime.
    throw new Error(
      `VITE_API_BASE_URL must be an absolute URL to build; got ${JSON.stringify(url)}`,
    )
  }
}

export default defineConfig(({ command, mode }) => ({
  // Resolves the `#/*` path alias straight from tsconfig.json, so there is no
  // second copy of it to keep in sync here.
  resolve: { tsconfigPaths: true },
  plugins: [
    devtools(),
    tailwindcss(),
    tanstackRouter({
      target: 'react',
      autoCodeSplitting: true,
      // Colocated tests live beside the route they cover. Without this the
      // generator warns about every one of them ("does not export a Route")
      // and the noise trains people to ignore a warning that matters.
      routeFileIgnorePattern: '\\.test\\.',
    }),
    viteReact(),
    ...(command === 'build' ? [cspMeta(apiOriginFor(mode))] : []),
  ],
  test: {
    environment: 'jsdom',
    globals: true,
    setupFiles: ['./src/test-setup.ts'],
    exclude: ['node_modules', 'dist'],
  },
}))
