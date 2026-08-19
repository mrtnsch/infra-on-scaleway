import { createFileRoute, notFound } from '@tanstack/react-router'
import { useJoke } from '#/features/jokes/api'
import {
  JokeCard,
  JokeCardSkeleton,
} from '#/features/jokes/components/joke-card'
import { ApiError } from '#/lib/api-error'
import { jokeErrorMessage } from '#/features/jokes/error-copy'

export const Route = createFileRoute('/jokes/$id')({
  head: () => ({ meta: [{ title: 'A joke' }] }),
  component: JokeDetailPage,
})

function JokeDetailPage() {
  const { id } = Route.useParams()
  const joke = useJoke(id)

  // A missing joke is a missing *page*, so it goes through the router's
  // not-found handling and gets the same 404 screen as a bad URL — rather than
  // an error card inside an otherwise working layout.
  if (joke.error instanceof ApiError && joke.error.status === 404) {
    throw notFound()
  }

  if (joke.isPending) return <JokeCardSkeleton />
  if (joke.isError) {
    return (
      <p role="alert" className="text-destructive">
        {jokeErrorMessage(joke.error)}
      </p>
    )
  }

  return <JokeCard joke={joke.data} linkToDetail={false} />
}
