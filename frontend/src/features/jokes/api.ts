/**
 * The seam. **The only file that imports `#/generated/api/jokes`** — an ESLint
 * `no-restricted-imports` rule keeps it that way.
 *
 * Every route and component gets its hooks from here, because the wrappers
 * below own two things no call site should have to repeat:
 *
 * 1. **The envelope.** The mutator returns `{ status, data, headers }`, so a
 *    generated hook's `data` is the envelope rather than the body. The queries
 *    unwrap in `select` (React Query memoises it against the cached result, so
 *    it runs on fetch, not on render) and the mutation unwraps in its
 *    `mutationFn`.
 * 2. **The error type.** The generated hooks default `TError` to the error
 *    *body* — `Problem` — which is a shape, not an `Error`. What the mutator
 *    throws is `ApiError`, and screens read `error`, so every wrapper says so.
 *
 * Model *types* (`Joke`, `JokeCategory`, …) may be imported from
 * `#/generated/api/model` anywhere; they are the contract, not the transport.
 */

import { useMutation, useQueryClient } from '@tanstack/react-query'
import type { UseMutationResult, UseQueryResult } from '@tanstack/react-query'
import {
  createJoke,
  getListJokesQueryKey,
  useGetJoke,
  useGetRandomJoke,
  useListJokes,
} from '#/generated/api/jokes/jokes'
import type { ApiError } from '#/lib/api-error'
import type {
  CreateJokeRequest,
  Joke,
  JokeCategory,
  JokePage,
  ListJokesParams,
} from '#/generated/api/model'

export function useJokes(
  params: ListJokesParams,
): UseQueryResult<JokePage, ApiError> {
  return useListJokes<JokePage, ApiError>(params, {
    query: {
      select: (response) => response.data,
      // Paging back and forth shouldn't blank the list out — keep the previous
      // page on screen while the next one loads.
      placeholderData: (previous) => previous,
    },
  })
}

export function useJoke(id: string): UseQueryResult<Joke, ApiError> {
  return useGetJoke<Joke, ApiError>(id, {
    query: { select: (response) => response.data },
  })
}

/**
 * Deliberately uncached. Every other query wants a 30s `staleTime`; this one is
 * a dice roll, and a cached result would make "Draw another" a no-op for half a
 * minute — the one interaction the screen exists for.
 */
export function useRandomJoke(
  category?: JokeCategory,
): UseQueryResult<Joke, ApiError> {
  return useGetRandomJoke<Joke, ApiError>(
    { category },
    {
      query: {
        select: (response) => response.data,
        staleTime: 0,
        gcTime: 0,
      },
    },
  )
}

export function useCreateJoke(): UseMutationResult<
  Joke,
  ApiError,
  CreateJokeRequest
> {
  const queryClient = useQueryClient()
  return useMutation<Joke, ApiError, CreateJokeRequest>({
    mutationFn: async (body) => (await createJoke(body)).data,
    onSuccess: () => {
      // Matched by prefix: the key's later elements are the page/size/category
      // params, and a new joke can land on any page of any filter.
      void queryClient.invalidateQueries({
        queryKey: getListJokesQueryKey(),
      })
    },
  })
}
