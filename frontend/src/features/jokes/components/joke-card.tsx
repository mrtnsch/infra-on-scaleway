import { Link } from '@tanstack/react-router'
import { Badge } from '#/components/ui/badge'
import { Card, CardContent, CardFooter } from '#/components/ui/card'
import { Skeleton } from '#/components/ui/skeleton'
import { CATEGORY_LABELS, formatCreatedAt } from '#/features/jokes/labels'
import { cn } from '#/lib/utils'
import type { Joke } from '#/generated/api/model'

export function JokeCard({
  joke,
  linkToDetail = true,
  className,
}: {
  joke: Joke
  linkToDetail?: boolean
  className?: string
}) {
  return (
    <Card className={cn('gap-4', className)}>
      <CardContent>
        <p className="text-pretty whitespace-pre-line">{joke.content}</p>
      </CardContent>
      <CardFooter className="flex items-center gap-3 text-sm text-muted-foreground">
        <Badge variant="secondary">{CATEGORY_LABELS[joke.category]}</Badge>
        <span>{formatCreatedAt(joke.createdAt)}</span>
        {linkToDetail ? (
          <Link
            to="/jokes/$id"
            params={{ id: joke.id }}
            className="ml-auto underline-offset-4 hover:text-foreground hover:underline"
          >
            Permalink
          </Link>
        ) : null}
      </CardFooter>
    </Card>
  )
}

export function JokeCardSkeleton() {
  return (
    <Card className="gap-4">
      <CardContent className="space-y-2">
        <Skeleton className="h-4 w-full" />
        <Skeleton className="h-4 w-4/5" />
      </CardContent>
      <CardFooter className="gap-3">
        <Skeleton className="h-5 w-20" />
        <Skeleton className="h-4 w-24" />
      </CardFooter>
    </Card>
  )
}
