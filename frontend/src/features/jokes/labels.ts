import { JokeCategory } from '#/generated/api/model'

/**
 * Display names for the wire enum. Typed as a total `Record`, so adding a
 * category to the OpenAPI spec breaks the build here rather than rendering a
 * raw `PROGRAMMING` somewhere in the UI.
 */
export const CATEGORY_LABELS: Record<JokeCategory, string> = {
  [JokeCategory.GENERAL]: 'General',
  [JokeCategory.PUN]: 'Puns',
  [JokeCategory.DAD]: 'Dad jokes',
  [JokeCategory.PROGRAMMING]: 'Programming',
}

export const CATEGORIES = Object.values(JokeCategory)

const dateFormat = new Intl.DateTimeFormat(undefined, { dateStyle: 'medium' })

export function formatCreatedAt(iso: string): string {
  const parsed = new Date(iso)
  return Number.isNaN(parsed.getTime()) ? '' : dateFormat.format(parsed)
}
