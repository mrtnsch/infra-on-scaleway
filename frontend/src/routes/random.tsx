import { useState } from 'react'
import { createFileRoute } from '@tanstack/react-router'
import { DicesIcon } from 'lucide-react'
import { Button } from '#/components/ui/button'
import { useRandomJoke } from '#/features/jokes/api'
import { CategoryToggle } from '#/features/jokes/components/category-filter'
import {
  JokeCard,
  JokeCardSkeleton,
} from '#/features/jokes/components/joke-card'
import { ApiError } from '#/lib/api-error'
import { jokeErrorMessage } from '#/features/jokes/error-copy'
import type { JokeCategory } from '#/generated/api/model'

export const Route = createFileRoute('/random')({
  head: () => ({ meta: [{ title: 'A random joke' }] }),
  component: RandomPage,
})

function RandomPage() {
  const [category, setCategory] = useState<JokeCategory>()
  const joke = useRandomJoke(category)

  // The spec answers 404 when the catalogue (or the chosen category) is empty.
  // That is an empty state, not a failure, so it gets its own branch above the
  // generic error one.
  const isEmpty = joke.error instanceof ApiError && joke.error.status === 404

  return (
    <div className="space-y-6">
      <CategoryToggle value={category} onChange={setCategory} />

      {joke.isPending ? (
        <JokeCardSkeleton />
      ) : isEmpty ? (
        <p className="text-muted-foreground">
          Nothing to draw from in this category yet.
        </p>
      ) : joke.isError ? (
        <p role="alert" className="text-destructive">
          {jokeErrorMessage(joke.error)}
        </p>
      ) : (
        <JokeCard joke={joke.data} />
      )}

      <Button
        onClick={() => void joke.refetch()}
        disabled={joke.isFetching}
        variant="outline"
      >
        <DicesIcon className="size-4" />
        {joke.isFetching ? 'Drawing…' : 'Draw another'}
      </Button>
    </div>
  )
}
