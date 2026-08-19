import { env } from '#/env'
import { ApiError, parseProblem } from '#/lib/api-error'

/**
 * Custom orval mutator (fetch client). Every generated React Query hook routes
 * through this. orval hands us a relative `url` (query params already baked in)
 * and a `RequestInit` with method/headers/body assembled; all this adds is the
 * backend base URL, the non-2xx → `ApiError` rule, and body parsing.
 *
 * The Joke API is unauthenticated, so there is no token to attach and no 401
 * refresh dance — the whole thing is one round trip.
 *
 * **Return shape:** even with `forceSuccessResponse`, orval types every
 * response as an envelope (`{ status, data, headers }`) and passes that through
 * as the hook's `TData` — so a raw hook's `data` is the envelope, not the body.
 * The wrappers in `features/jokes/api.ts` unwrap it; nothing else should have
 * to know. The bound on `T` documents the contract, and we return exactly that
 * shape, or the generated types would lie about the runtime value.
 */
export const apiFetch = async <
  T extends { status: number; data: unknown; headers: Headers },
>(
  url: string,
  init: RequestInit = {},
): Promise<T> => {
  const res = await fetch(`${env.VITE_API_BASE_URL}${url}`, init)

  if (!res.ok) {
    const body = await res.text().catch(() => '')
    throw new ApiError(res.status, body, parseProblem(body))
  }

  // Success bodies are JSON when the server says so; anything else (a 204, an
  // empty body, a non-JSON page) is treated as no content. Parsing the text
  // ourselves rather than calling `res.json()` means an empty body yields
  // `undefined` instead of throwing.
  const isJson = res.headers.get('content-type')?.includes('json')
  const text = isJson === true ? await res.text() : ''
  const data: unknown = text ? JSON.parse(text) : undefined

  return { data, status: res.status, headers: res.headers } as T
}

export default apiFetch
