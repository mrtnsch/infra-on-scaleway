import { createFileRoute } from '@tanstack/react-router'
import { useJokes } from '#/features/jokes/api'
import { CategoryFilter } from '#/features/jokes/components/category-filter'
import {
  JokeCard,
  JokeCardSkeleton,
} from '#/features/jokes/components/joke-card'
import { Pagination } from '#/features/jokes/components/pagination'
import { jokeErrorMessage } from '#/features/jokes/error-copy'
import { jokeSearchSchema } from '#/features/jokes/search'

export const Route = createFileRoute('/')({
  // Typed URL state: `Route.useSearch()` below is inferred from this schema,
  // and the same values go straight into `ListJokesParams`.
  validateSearch: jokeSearchSchema,
  head: () => ({ meta: [{ title: 'Joke catalogue' }] }),
  component: CataloguePage,
})

function CataloguePage() {
  const { category, page, size } = Route.useSearch()
  const jokes = useJokes({ category, page, size })

  return (
    <div className="space-y-6">
      <CategoryFilter selected={category} />

      {jokes.isPending ? (
        <div className="space-y-4">
          <JokeCardSkeleton />
          <JokeCardSkeleton />
          <JokeCardSkeleton />
        </div>
      ) : jokes.isError ? (
        <p role="alert" className="text-destructive">
          {jokeErrorMessage(jokes.error)}
        </p>
      ) : jokes.data.items.length === 0 ? (
        <p className="text-muted-foreground">
          No jokes here yet. Be the first to add one.
        </p>
      ) : (
        <>
          <div className="space-y-4">
            {jokes.data.items.map((joke) => (
              <JokeCard key={joke.id} joke={joke} />
            ))}
          </div>
          <Pagination
            page={jokes.data.page}
            totalPages={jokes.data.totalPages}
          />
        </>
      )}
    </div>
  )
}
