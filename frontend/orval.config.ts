import { defineConfig } from 'orval'

/**
 * Generates typed React Query hooks + models from the backend's OpenAPI spec.
 *
 * The spec is read straight out of `backend/` rather than pulled from a running
 * server: it is committed in this repo, so generation is offline, needs no
 * backend, and the client can never drift from the contract the backend ships.
 * A change to that file in a backend PR is the signal that this app needs work.
 *
 * The output is git-ignored (build artifact) — `dev`, `build` and `verify` all
 * run `pnpm api:generate` first, so a fresh clone resolves `#/generated`.
 */
export default defineConfig({
  jokes: {
    input: '../backend/src/main/resources/api/openapi.yaml',
    output: {
      mode: 'tags-split',
      target: 'src/generated/api',
      schemas: 'src/generated/api/model',
      client: 'react-query',
      clean: true,
      override: {
        mutator: {
          path: 'src/lib/api-mutator.ts',
          name: 'apiFetch',
        },
        // The mutator throws ApiError on any non-2xx, so a resolved response is
        // always the success branch. Narrowing the return type to it means
        // `.data` is the success DTO directly, with no per-call-site cast.
        fetch: {
          forceSuccessResponse: true,
        },
      },
    },
  },
})
