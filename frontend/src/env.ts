import { createEnv } from '@t3-oss/env-core'
import { z } from 'zod'

/**
 * Validated client env. Every var here is public — VITE_-prefixed vars are
 * inlined into the shipped bundle at build time, so a secret placed here is a
 * secret published. There is exactly one: the backend this SPA talks to.
 *
 * Because it is baked in at build time, the built `dist/` is environment-
 * specific — there is no runtime config to read, only a bucket full of static
 * files. Validating here turns a mistyped or missing value into one loud error
 * at boot instead of a hundred requests to `undefined/jokes`.
 */
export const env = createEnv({
  clientPrefix: 'VITE_',
  client: {
    VITE_API_BASE_URL: z.url(),
  },
  runtimeEnv: import.meta.env,
  emptyStringAsUndefined: true,
})
