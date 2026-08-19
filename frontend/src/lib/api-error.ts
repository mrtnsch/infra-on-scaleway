/**
 * The error every non-2xx response becomes.
 *
 * The backend answers failures with RFC 9457 problem details
 * (`application/problem+json`), which is what Spring's `ProblemDetail` support
 * emits and what the OpenAPI spec documents for 400 / 404 / 409. `problem`
 * carries the parsed body when it was one; `body` keeps the raw text for
 * anything else (HTML from a proxy, an empty response, a truncated stream).
 */
export interface Problem {
  type?: string
  title?: string
  status?: number
  detail?: string
  instance?: string
}

export class ApiError extends Error {
  constructor(
    public status: number,
    public body: string,
    public problem?: Problem,
  ) {
    super(`API request failed: ${status}`)
    this.name = 'ApiError'
  }
}

/**
 * Pull an RFC 9457 problem detail out of a response body. Every field is
 * optional in the spec, so this accepts any JSON object and copies across the
 * members it recognises with the right type. Anything else yields `undefined`,
 * which callers read as "no machine-readable reason — fall back to the status".
 */
export function parseProblem(body: string): Problem | undefined {
  let parsed: unknown
  try {
    parsed = JSON.parse(body)
  } catch {
    return undefined
  }
  if (parsed === null || typeof parsed !== 'object' || Array.isArray(parsed)) {
    return undefined
  }

  const raw = parsed as Record<string, unknown>
  const str = (key: string) => {
    const value = raw[key]
    return typeof value === 'string' ? value : undefined
  }

  return {
    type: str('type'),
    title: str('title'),
    status: typeof raw.status === 'number' ? raw.status : undefined,
    detail: str('detail'),
    instance: str('instance'),
  }
}
