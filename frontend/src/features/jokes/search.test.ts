import { describe, expect, it } from 'vitest'
import { jokeSearchSchema } from '#/features/jokes/search'

describe('jokeSearchSchema', () => {
  it('fills in defaults for an empty query string', () => {
    expect(jokeSearchSchema.parse({})).toEqual({
      category: undefined,
      page: 0,
      size: 20,
    })
  })

  it('coerces the numeric params, which arrive as strings from the URL', () => {
    expect(jokeSearchSchema.parse({ page: '3', size: '50' })).toMatchObject({
      page: 3,
      size: 50,
    })
  })

  it('falls back rather than throwing on values a person can type', () => {
    // A hand-edited URL must not take the route down: ?page=banana is page 0,
    // and ?size=5000 is clamped here instead of 400-ing at the backend.
    expect(
      jokeSearchSchema.parse({ page: 'banana', size: '5000' }),
    ).toMatchObject({ page: 0, size: 20 })
    expect(jokeSearchSchema.parse({ page: '-1' })).toMatchObject({ page: 0 })
  })

  it('keeps a known category and drops an unknown one', () => {
    expect(jokeSearchSchema.parse({ category: 'PUN' })).toMatchObject({
      category: 'PUN',
    })
    expect(jokeSearchSchema.parse({ category: 'LIMERICK' })).toMatchObject({
      category: undefined,
    })
  })
})
