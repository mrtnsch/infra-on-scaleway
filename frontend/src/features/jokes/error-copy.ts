import { ApiError } from '#/lib/api-error'

/**
 * Turns whatever React Query handed us into one sentence a person can act on.
 *
 * The backend's problem details carry a `detail` written for humans, so it is
 * preferred when present; the per-status fallbacks below only cover the case
 * where it isn't (a proxy's HTML error page, a dropped connection). The three
 * statuses spelled out are the ones the OpenAPI spec actually documents.
 */
export function jokeErrorMessage(error: unknown): string {
  if (!(error instanceof ApiError)) {
    return 'Could not reach the joke service. Check your connection and try again.'
  }

  const detail = error.problem?.detail
  if (detail !== undefined && detail !== '') return detail

  switch (error.status) {
    case 400:
      return 'That request was rejected — check the joke text and try again.'
    case 404:
      return 'Nothing here.'
    case 409:
      return 'That exact joke is already in the catalogue for this category.'
    default:
      return error.status >= 500
        ? 'The joke service is having a bad day. Try again in a moment.'
        : 'Something went wrong talking to the joke service.'
  }
}
