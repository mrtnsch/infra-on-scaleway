import { describe, expect, it } from 'vitest'
import { parseProblem } from '#/lib/api-error'

describe('parseProblem', () => {
  it('reads an RFC 9457 body of the shape Spring emits', () => {
    const body = JSON.stringify({
      type: 'about:blank',
      title: 'Conflict',
      status: 409,
      detail: 'An identical joke already exists in this category.',
      instance: '/jokes',
    })

    expect(parseProblem(body)).toEqual({
      type: 'about:blank',
      title: 'Conflict',
      status: 409,
      detail: 'An identical joke already exists in this category.',
      instance: '/jokes',
    })
  })

  it('ignores members of the wrong type instead of trusting them', () => {
    const problem = parseProblem(JSON.stringify({ status: '409', detail: 12 }))
    expect(problem).toMatchObject({ status: undefined, detail: undefined })
  })

  it('gives up quietly on anything that is not a JSON object', () => {
    // What a proxy or a load balancer returns when the app never saw the request.
    expect(parseProblem('<html>502 Bad Gateway</html>')).toBeUndefined()
    expect(parseProblem('')).toBeUndefined()
    expect(parseProblem('[1, 2, 3]')).toBeUndefined()
    expect(parseProblem('null')).toBeUndefined()
  })
})
