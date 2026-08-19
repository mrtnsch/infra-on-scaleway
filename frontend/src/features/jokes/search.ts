import { z } from 'zod'
import { JokeCategory } from '#/generated/api/model'

/**
 * The catalogue's URL state, and the single source of truth for it: the route's
 * `validateSearch` runs this, so `Route.useSearch()` is typed from it and the
 * values feed straight into `ListJokesParams`.
 *
 * Nothing here throws, because these values come out of a URL a person can
 * edit: `?page=banana` shows page 0 rather than taking the route down, and the
 * bounds mirror the OpenAPI spec so a hand-typed `?size=5000` is clamped here
 * instead of 400-ing at the backend.
 *
 * `.default()` and `.catch()` together are not redundant: `.default()` is what
 * makes the param optional on the schema's *input* side — the type
 * `<Link to="/">` checks, so without it every link to the catalogue, the header
 * one included, would have to spell out a full search object — while `.catch()`
 * handles input that is present but nonsense. The output is always populated
 * either way.
 */
export const jokeSearchSchema = z.object({
  category: z.enum(JokeCategory).optional().catch(undefined),
  page: z.coerce.number().int().min(0).default(0).catch(0),
  size: z.coerce.number().int().min(1).max(100).default(20).catch(20),
})

export type JokeSearch = z.infer<typeof jokeSearchSchema>
